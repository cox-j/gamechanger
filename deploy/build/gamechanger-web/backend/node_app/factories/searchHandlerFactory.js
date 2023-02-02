const logger = require('../lib/logger');

const CLONE_META = require('../models').clone_meta;

class SearchHandlerFactory {

	constructor() {
		this.reloadCloneMeta();
		this.logger = logger;
	}

	reloadCloneMeta() {
		this.cloneMetaMap = {};
		this.searchHandlerMap = {};
		CLONE_META.findAll().then((meta) => {
			meta.forEach((m) => {
				this.cloneMetaMap[m.clone_name] = {
					searchModule: m.search_module
				};
				this.searchHandlerMap[m.search_module] = require(`../modules/${m.search_module}`);
			});
		});
	}

	createSearchHandler(cloneName) {
		if(this.cloneMetaMap[cloneName] &&
		this.cloneMetaMap[cloneName].searchModule &&
		this.searchHandlerMap[this.cloneMetaMap[cloneName].searchModule]) {
			return this.searchHandlerMap[this.cloneMetaMap[cloneName].searchModule];
		} else {
			this.logger.info("searchHandlerFactory.js - row 30")
			this.logger.info(JSON.stringify(this.cloneMetaMap));
			this.logger.info(cloneName);
			this.logger.info(JSON.stringify(this.searchHandlerMap));
			throw 'Invalid clone or handler provided';
		}
	}
}

module.exports.SearchHandlerFactory = SearchHandlerFactory;