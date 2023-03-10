const LOGGER = require('../lib/logger');
const constantsFile = require('../config/constants');
const axiosLib = require('axios');
const https = require('https');
const AWS = require('aws-sdk');
const neo4jLib = require('neo4j-driver');
const asyncRedisLib = require('async-redis');
const { ESSearchLib } = require('./ESSearchLib');
const {Op} = require('sequelize');
const edaDatabaseFile = require('../models/eda');
const LINE_ITEM_DETAILS = edaDatabaseFile.line_item_details;
const ALL_OUTGOING_COUNTS = edaDatabaseFile.all_outgoing_counts_pdf_pds_xwalk_only;
const fs = require('fs');
const exec = require('child_process');


const SAMPLING_BYTES = 4096;

class DataLibrary {

	constructor(opts = {}) {
		const {
			constants = constantsFile,
			logger = LOGGER,
			axios = axiosLib,
			neo4j = neo4jLib,
			esSearchLib,
			s3Opt = {},
			redisClientDB = 8,
			redisDB = asyncRedisLib.createClient(process.env.REDIS_URL || 'redis://localhost'),
			edaDatabase = edaDatabaseFile,
			lineItemDetails = LINE_ITEM_DETAILS,
			allOutgoingCounts = ALL_OUTGOING_COUNTS
		} = opts;

		this.redisClientDB = redisClientDB;
		this.redisDB = redisDB;
		this.logger = logger;
		this.constants = constants;
		this.axios = axios;
		this.neo4j = neo4j;
		this.esRequestConfig = this.getESRequestConfig(this.constants.GAMECHANGER_ELASTIC_SEARCH_OPTS);
		this.esEDARequestConfig = this.getESRequestConfig(this.constants.EDA_ELASTIC_SEARCH_OPTS);
		this.esSearchLib = esSearchLib;
		this.edaDatabase = edaDatabase;
		this.lineItemDetails = lineItemDetails;
		this.allOutgoingCounts = allOutgoingCounts;

		if (!esSearchLib) {
			try {
				const gamechangerConfig = this.getESClientConfig(this.constants.GAMECHANGER_ELASTIC_SEARCH_OPTS);
				const edaConfig = this.getESClientConfig(this.constants.EDA_ELASTIC_SEARCH_OPTS);

				this.esSearchLib = new ESSearchLib();

				this.esSearchLib.addClient('gamechanger', gamechangerConfig, 'DataLibrary constructor');
				this.esSearchLib.addClient('eda', edaConfig, 'DataLibrary constructor');
			} catch (e) {
				this.logger.error(`CONSTRUCTOR ERROR: ${e.message}`, 'SEAFUUV', 'DataLibrary');
			}
		}

		if (this.constants.S3_REGION) {
			s3Opt.region = this.constants.S3_REGION;
		}

		if(process.env.S3_IS_MINIO === 'true') {
			s3Opt.accessKeyId = process.env.S3_ACCESS_KEY;
			s3Opt.secretAccessKey = process.env.S3_SECRET_KEY;
			s3Opt.endpoint = process.env.S3_ENDPOINT;
			s3Opt.s3ForcePathStyle = true;
			s3Opt.signatureVersion = 'v4';
		}

		try {
			this.awsS3Client = new AWS.S3(s3Opt);
		} catch (err) {
			this.awsS3Client = null;
		}

		const clientOptions = {
			s3Client: this.awsS3Client,
			maxAsyncS3: 20, // this is the default
			s3RetryCount: 3, // this is the default
			s3RetryDelay: 1000, // this is the default
			multipartUploadThreshold: 20971520, // this is the default (20 MB)
			multipartUploadSize: 15728640, // this is the default (15 MB)
		};

		this.queryElasticSearch = this.queryElasticSearch.bind(this);
		this.getESRequestConfig = this.getESRequestConfig.bind(this);
		this.getElasticsearchSearchUrl = this.getElasticsearchSearchUrl.bind(this);
		this.getElasticSearchFields = this.getElasticSearchFields.bind(this);
		this.getFilePDF = this.getFilePDF.bind(this);
		this.queryGraph = this.queryGraph.bind(this);
		this.putDocument = this.putDocument.bind(this);
	}

	// async queryElasticSearch(esQuery, esIndex, userId, options, isClone = false, cloneData = {}, multiSearch = false) {
	// 	try {
	// 		const esUrl = this.getElasticsearchSearchUrl(userId, esIndex, isClone, cloneData, multiSearch);
	//
	// 		let configOpts = options || this.esRequestConfig;
	//
	// 		return await this.axios.post(esUrl, esQuery, configOpts);
	//
	// 	} catch (err) {
	// 		const msg = (err && err.message) ? `${err.message}` : `${err}`;
	// 		this.logger.error(msg, '9VAHLY9', userId);
	// 		throw msg;
	// 	}
	// }
	

	async queryLineItemPostgres(columns, tables, filenames){
		try {
			// original raw query
			// const results = await this.edaDatabase.eda.query('SELECT p.filename, p.prod_or_svc, p.prod_or_svc_desc,p.li_base, p.li_type, p.obligated_amount,'+
			//  'p.obligated_amount_cin, p.row_id, x.pdf_filename, x.pds_filename FROM pds_parsed.line_item_details p, '+
			//  'pds_parsed_validation.all_outgoing_counts_pdf_pds_xwalk_only x WHERE x.pdf_filename IN (:files)'+
			//  'AND x.pds_filename = p.filename',
			//  {replacements:{files: filenames}, type: Sequelize.QueryTypes.SELECT, raw: true, logging: console.log})

			let results = await this.lineItemDetails.findAll({
				include: [{
					model: this.allOutgoingCounts,
					attributes: ['pdf_filename', 'pds_filename'],
					where: {
						pdf_filename: { 
							[Op.in]: filenames
						},
					},
				}],
				attributes: ['filename', 'prod_or_svc', 'prod_or_svc_desc', 'li_base', 'li_type', 'obligated_amount', 'obligated_amount_cin', 'row_id'],
			});

			results = results.map(result => {
				result = result.dataValues;
				let data = result.all_outgoing_counts_pdf_pds_xwalk_only ? result.all_outgoing_counts_pdf_pds_xwalk_only.dataValues : {}; 
				result.pdf_filename = data.pdf_filename;
				result.pds_filename = data.pds_filename;
				return result;
			});

			return results;
		} catch (err) {
			this.logger.error(err, 'MJ2D6XT');
			return { results: [], totalCount: 0, count: 0 };
		}
	};

	async queryElasticSearch(clientName, index, queryBody, user) {
		try {
			this.logger.info(JSON.stringify(this.esSearchLib.queryElasticsearch(clientName, index, queryBody, user)))
			this.logger.info("dataLibrary.js - initiating queryElasticSearch")
			return await this.esSearchLib.queryElasticsearch(clientName, index, queryBody, user);
		} catch (err) {
			const msg = (err && err.message) ? `${err.message}` : `${err}`;
			this.logger.error(msg, '9ZJ4HRN', user);
			throw err;
		}

	}

	async mulitqueryElasticSearch(clientName, index, queryBodiesArray, user) {
		try {
			return await this.esSearchLib.multiqueryElasticsearch(clientName, index, queryBodiesArray, user);
		} catch (err) {
			const msg = (err && err.message) ? `${err.message}` : `${err}`;
			this.logger.error(msg, 'P8JKHRN', user);
			throw err;
		}

	}
	async putDocument(clientName, index, searchLog) {
		try {
			return await this.esSearchLib.addDocument(clientName, index, searchLog);
		} catch (err) {
			const msg = (err && err.message) ? `${err.message}` : `${err}`;
			this.logger.error(msg, 'P8JKARM');
			throw err;
		}

	}
	async getElasticSearchFields(esIndex, userId) {
		try {
			let opts = Object.assign({}, this.constants.GAMECHANGER_ELASTIC_SEARCH_OPTS);

			const esUrl = `${opts.protocol}://${opts.host}:${opts.port}/${esIndex}/_mapping`;

			return await this.axios.get(esUrl, this.esRequestConfig);

		} catch (err) {
			const msg = (err && err.message) ? `${err.message}` : `${err}`;
			this.logger.error(msg, 'SNX3AII', userId);
			throw msg;
		}
	}

	getESRequestConfig({user, password, port, ca, index}) {
		let reqConfig = {};
		if (port === '443' && user) {
			reqConfig.httpsAgent = new https.Agent({
				rejectUnauthorized: false,
				keepAlive: true,
				ca,
			});
			reqConfig.auth = {
				username: user,
				password
			};
		} else if (port === '443') {
			reqConfig.httpsAgent = new https.Agent({
				rejectUnauthorized: false,
				keepAlive: true,
				ca,
			});
		}
		return reqConfig;
	}

	getESClientConfig ({ user, password, ca, protocol, host, port, index, requestTimeout }) {
		let config = {
			node: {}
		};
		if (port === '443') {
			config.node.agent = () => {
				return new https.Agent({
					rejectUnauthorized: false,
					keepAlive: true,
					ca,
				});
			};
			config.auth = {
				username: user,
				password
			};
		}
		if (user) {
			config.auth = {
				username: user,
				password
			};
		};
		config.node.url = new URL(`${protocol}://${host}:${port}`);
		config.requestTimeout = requestTimeout;

		return config;
	}

	getElasticsearchSearchUrl(user, index, isClone = false, cloneData = {}, multiSearch = false) {
		const {clone_data = {}} = cloneData;
		try {
			let opts = Object.assign({}, this.constants.GAMECHANGER_ELASTIC_SEARCH_OPTS);

			if (isClone && cloneData.clone_data.esCluster !== 'gamechanger') {
				switch (cloneData.clone_data.esCluster) {
					case 'eda':
						opts = Object.assign({}, this.constants.EDA_ELASTIC_SEARCH_OPTS);
						break;
				}
			}

			// generic search passes in auxIndex for index here
			if (index && clone_data.auxIndex === index) {
				opts.index = index;
			} else if (isClone && clone_data.gcIndex) {
				// if this is a clone and want to use different primary gc index
				opts.index = cloneData.clone_data.gcIndex;
			} else if (isClone && cloneData.clone_data.project_name) {
				// otherwise clone will default to project_name
				opts.index = cloneData.clone_data.project_name;
			} else {
				opts.index = index || opts.index;
			}

			let url;
			if (multiSearch === true) {
				url = `${opts.protocol}://${opts.host}:${opts.port}/${opts.index}/_msearch`;
			} else {
				url = `${opts.protocol}://${opts.host}:${opts.port}/${opts.index}/_search`;
			}

			return url;
		} catch (err) {
			this.logger.error(err, '155M3L7', user);
			throw err;
		}

	}

	getFilePDF(res, data, userId) {
		let { dest, filekey, samplingType } = data;
		const { req } = res;
		const { _parsedOriginalUrl: { query = undefined } } = req;
		const queryString = query ? `?${query}` : '';
		
		this.logger.info(req.query.clone_name)
		try {
			
			if((req.permissions.includes('Webapp Super Admin') || req.permissions.includes('View EDA')) && req.query.isClone && req.query.clone_name === 'eda'){

				const edaUrl = this.constants.GAMECHANGER_BACKEND_EDA_URL+ req.baseUrl + req.path + queryString;

				this.axios({
					method: 'get',
					url: edaUrl,
					responseType:'stream'
				})
					.then(response => {
						response.data.pipe(res);
					})
					.catch(err=>{
						this.logger.error(err, 'N4BAC3N', userId);
						throw err;
					});
			}
			else { // if (req.query.isClone && req.query.clone_name === 'I&M') { //CHANGE THIS FOR IMMIGRATION MIGRATION)
				// const params = {
				// 	Bucket: dest,
				// 	Key: decodeURIComponent(filekey)
				// };
	
				// if (samplingType === 'head') {
				// 	params.Range = 'bytes=0-' + SAMPLING_BYTES;
				// } else if (samplingType === 'tail') {
				// 	params.Range = 'bytes=-' + SAMPLING_BYTES;
				// }


	
				try {
					// res.setHeader(`Content-Disposition`, `attachment; filename="/opt/app-root/src/common/data/im/raw/NICM-Declassified-Africa-Increasing-Weight-in-Global-Arena-2022.pdf"`);
					
					// this.getObject("/opt/app-root/src/common/data/im/raw/NICM-Declassified-Africa-Increasing-Weight-in-Global-Arena-2022.pdf").createReadStream().pipe(res); ///CHANGE THIS UP TO PULL DATA LOCALLY?
					// this.logger.info(res.query.clone_name);
					// res.setHeader(`Content-Disposition`, `attachment; filename=${encodeURIComponent(filekey)}`);
					this.logger.info("breakpoint dataLibrary.js");
					this.logger.info(filekey);
					this.logger.info(filekey.replace('gamechanger/projects/undefined/pdf/', ''));
					fs.createReadStream(filekey.replace('gamechanger/projects/undefined/pdf/', '')).pipe(res);
					this.logger.info("breakpoint2 dataLibrary.js");
				} catch (err) {
					this.logger.error(err, 'IPOQHZS', userId);
					throw err;
				}				
			}

			// else {
			// 	const params = {
			// 		Bucket: dest,
			// 		Key: decodeURIComponent(filekey)
			// 	};
	
			// 	if (samplingType === 'head') {
			// 		params.Range = 'bytes=0-' + SAMPLING_BYTES;
			// 	} else if (samplingType === 'tail') {
			// 		params.Range = 'bytes=-' + SAMPLING_BYTES;
			// 	}
	
			// 	try {
			// 		res.setHeader(`Content-Disposition`, `attachment; filename=${encodeURIComponent(filekey)}`);
			// 		this.awsS3Client.getObject(params).createReadStream().pipe(res); ///CHANGE THIS UP TO PULL DATA LOCALLY?
			// 	} catch (err) {
			// 		this.logger.error(err, 'IPOQHZS', userId);
			// 		throw err;
			// 	}
			// }
	
		} catch (err) {
			const msg = (err && err.message) ? `${err.message}` : `${err}`;
			this.logger.error(msg, 'PFXO7XD', userId);
			throw msg;
		}
	}

	async getFileThumbnail(data, userId){
		let { dest, folder, filename, clone_name } = data;
		const key = `${clone_name}/${folder}/${filename}`;
		let filetype = filename.split('.').pop();
		if (filetype === '.png'){
			filetype = 'image/png'
		} else if(filetype === 'svg'){
			filetype = 'image/svg+xml'
		}

		const params = {
			Bucket: dest,
			Key: key,
			ResponseContentType: 'image/png'
		};

		return new Promise(async (resolve,reject) => {
			if(filename === 'none'){
				reject(filename);
			}
			await this.redisDB.select(this.redisClientDB);
			const cachedResults = await this.redisDB.get(key);
			if (cachedResults) {
				resolve(cachedResults);
			} else {
				this.awsS3Client.getObject(params, async (err, data) => {
					if(err) {
						reject(err, err.stack);
					} else {
						try {
							const result = data.Body.toString('base64')
							await this.redisDB.set(key, result);
							resolve(result);
						} catch (e) {
							reject(e)
						}
					}
				})
			}

		});
	}

	async queryGraph(query, parameters = {}, userId) {
		try {
			const driver = await this.getDriver();
			await driver.verifyConnectivity();
			const session = await this.getSession(driver);
			// console.log(body.query);
			const result = await session.run(query, parameters);
			await this.close(driver, session);
			return { result };

		} catch (err) {
			this.logger.error(err, 'LKRS7EO', userId);
			throw err;
		}
	}

	async close(driver, session) {
		await session.close();
		await driver.close();
	}

	async getDriver() {
		return this.neo4j.driver(
			this.constants.GRAPH_DB_CONFIG.url,
			this.neo4j.auth.basic(this.constants.GRAPH_DB_CONFIG.user, this.constants.GRAPH_DB_CONFIG.password)
		);
	}

	async getSession(driver) {
		return driver.session();
	}
}

module.exports.DataLibrary = DataLibrary;
