

import React from 'react';
import _ from 'lodash';

import ViewHeader from '../../mainView/ViewHeader';
import { trackEvent } from '../../telemetry/Matomo';
import {
	getSearchObjectFromString,
	getUserData,
	setState,
} from '../../../utils/sharedFunctions';
import DefaultDocumentExplorer from './defaultDocumentExplorer';
import Permissions from '@dod-advana/advana-platform-ui/dist/utilities/permissions';
import { Card } from '../../cards/GCCard';
import GameChangerSearchMatrix from '../../searchMetrics/GCSearchMatrix';
import GameChangerSideBar from '../../searchMetrics/GCSideBar';
import Pagination from 'react-js-pagination';
import GCTooltip from '../../common/GCToolTip';
import DefaultGraphView from '../../graph/defaultGraphView';
import defaultMainViewHandler from '../default/defaultMainViewHandler';
import {
	getTrackingNameForFactory,
	StyledCenterContainer,
	scrollToContentTop,
	getOrgToOrgQuery,
	getTypeQuery,
	getQueryVariable,
	RESULTS_PER_PAGE,
} from '../../../utils/gamechangerUtils';
import ExportResultsDialog from '../../export/ExportResultsDialog';
import { gcOrange } from '../../common/gc-colors';
import { DidYouMean } from '../../searchBar/SearchBarStyledComponents';
import ResultView from '../../mainView/ResultView';
import QueryDialog from '../../admin/util/QueryDialog';
import DocDialog from '../../admin/util/DocDialog';
import LoadingIndicator from '@dod-advana/advana-platform-ui/dist/loading/LoadingIndicator';
import MagellanTrendingLinkList from '../../common/MagellanTrendingLinkList';
import GameChangerAPI from '../../api/gameChanger-service-api';

const gameChangerAPI = new GameChangerAPI();

const fullWidthCentered = {
	width: '100%',
	display: 'flex',
	flexDirection: 'column',
	justifyContent: 'center',
	alignItems: 'center',
};

const styles = {
	listViewBtn: {
		minWidth: 0,
		margin: '20px 0px 0px',
		marginLeft: 10,
		padding: '0px 7px 0',
		fontSize: 20,
		height: 34,
	},
	cachedResultIcon: {
		display: 'flex',
		justifyContent: 'center',
		padding: '0 0 1% 0',
	},
	searchResults: fullWidthCentered,
	paginationWrapper: fullWidthCentered,
	tabContainer: {
		alignItems: 'center',
		marginBottom: '14px',
		height: '600px',
		margin: '0px 4% 0 65px',
	},
	tabButtonContainer: {
		width: '100%',
		padding: '0em 1em',
		alignItems: 'center',
	},
	spacer: {
		flex: '0.375',
	},
	resultsCount: {
		fontFamily: 'Noto Sans',
		fontSize: 22,
		fontWeight: 'bold',
		color: '#131E43',
		paddingTop: '10px',
	},
};

const getDocumentProperties = async (dispatch) => {
	let documentProperties = [];

	try {
		const docPropsResponse = await gameChangerAPI.getDocumentProperties();
		const keepList = {
			display_title_s: 'Title',
			display_doc_type_s: 'Document Type',
			display_org_s: 'Organization',
			doc_num: 'Document Number',
			filename: 'Filename',
		};
		documentProperties = docPropsResponse.data.filter(
			(field) => Object.keys(keepList).indexOf(field.name) !== -1
		);
		documentProperties.forEach((field) => {
			field.display_name = keepList[field.name];
		});
	} catch (e) {
		console.log(e);
	}

	setState(dispatch, { documentProperties });

	return documentProperties;
};

const checkForTinyURL = async (location) => {
	const tiny = getQueryVariable('tiny');

	if (!location || !tiny) {
		return false;
	}

	if (tiny) {
		const res = await gameChangerAPI.convertTinyURLPOST(tiny);
		return res.data.url;
	}
};

const handleDidYouMeanClicked = (didYouMean, state, dispatch) => {
	trackEvent(
		getTrackingNameForFactory(state.cloneData.clone_name),
		'SuggestionSelected',
		'DidYouMean'
	);
	setState(dispatch, { searchText: didYouMean, runSearch: true });
};

const ASRSMainViewHandler = {
	async handlePageLoad(props) {
		const {
			state,
			dispatch,
			history,
			searchHandler,
		} = props;
		
		if (state.runSearch || state.runDocumentComparisonSearch) return;

		const documentProperties = await getDocumentProperties(dispatch);
		let newState = { ...state, documentProperties };

		// redirect the page if using tinyurl
		const url = await checkForTinyURL(window.location);
		if (url) {
			history.replace(`#/${url}`);
			//setPageLoaded(false);
			//return;
		} else if (url === null) {
			///history.replace(state.cloneData.clone_data.url);
			return;
		}

		try {
			//getTrendingSearches(state.cloneData);
			const daysBack=14
			let trendingES = await gameChangerAPI.trendingSearches({daysBack});
			
			setState(dispatch, { trending: trendingES});

		} catch (e) {
			console.log(e)
		}

		try {
			gameChangerAPI
				.recentSearchesPOST(state.cloneData.clone_name)
				.then(({ data }) => {
					setState(dispatch, { recentSearches: data });
				});
		} catch (e) {
			// Do nothing
		}

		try {
			// gameChangerAPI.gcCrawlerTrackerData().then(({data}) => {
			// 	const names = data.docs.map(d=>d.crawler_name)
			// 	setState(dispatch, {crawlerSources: names});
			// });
			// let crawlerSources = await gameChangerAPI.gcCrawlerSealData();
			// setState(dispatch, {crawlerSources: crawlerSources.data});
		} catch (e) {
			// Do nothing
		}

		// fetch ES index
		try {
			const esIndex = await gameChangerAPI.getElasticSearchIndex();
			setState(dispatch, { esIndex: esIndex.data });
		} catch (e) {
			console.log(e);
		}

		try {
			await getUserData(dispatch);
		} catch (e) {
			console.log(e);
		}

		const parsedURL = searchHandler.parseSearchURL(newState);
		if (parsedURL.searchText) {
			newState = { ...newState, ...parsedURL, runSearch: true };
			setState(dispatch, newState);

			searchHandler.setSearchURL(newState);
		}
		
	},

	renderHideTabs(props) {
		const { state, dispatch, searchHandler } = props;
		const {
			componentStepNumbers,
			cloneData,
			resetSettingsSwitch,
			didYouMean,
			loading,
			prevSearchText,
		} = state;
		const showDidYouMean = didYouMean && !loading;
		const latestLinks =
			localStorage.getItem(`recent${cloneData.clone_name}Searches`) || '[]';
		const trendingStorage =
			localStorage.getItem(`trending${cloneData.clone_name}Searches`) || '[]';
		let trendingLinks = [];
		if (trendingStorage) {
			JSON.parse(trendingStorage).forEach((search) => {
				if (search.search) {
					trendingLinks.push(search.search.replaceAll('&#039;', '"'));
				}
			});
		}

		if (prevSearchText) {
			if (!resetSettingsSwitch) {
				dispatch({ type: 'RESET_SEARCH_SETTINGS' });
				setState(dispatch, {
					resetSettingsSwitch: true,
					showSnackbar: true,
					snackBarMsg: 'Search settings reset',
				});
				if (searchHandler) searchHandler.setSearchURL(state);
			}
		}

		const handleLinkListItemClick = (searchText) => {
			trackEvent(
				getTrackingNameForFactory(cloneData.clone_name),
				'TrendingSearchSelected',
				'text',
				searchText
			);
			setState(dispatch, {
				searchText,
				autoCompleteItems: [],
				metricsCounted: false,
				runSearch: true,
			});
		};

		return (
			<div style={{ marginTop: '40px' }}>
				{prevSearchText && (
					<div style={{ margin: '10px auto', width: '67%' }}>
						<div style={styles.resultsCount}>
							<p style={{ fontWeight: 'normal', display: 'inline' }}>
								Looks like we don't have any matches for{' '}
							</p>
							"{prevSearchText}"
						</div>
					</div>
				)}
				{showDidYouMean && (
					<div
						style={{
							margin: '10px auto',
							fontSize: '25px',
							width: '67%',
							paddingLeft: 'auto',
						}}
					>
						Did you mean{' '}
						<DidYouMean
							onClick={() =>
								handleDidYouMeanClicked(didYouMean, state, dispatch)
							}
						>
							{didYouMean}
						</DidYouMean>
						?
					</div>
				)}
				{cloneData.clone_name === 'gamechanger' && (
					<div style={{ margin: '10px auto', width: '67%' }}>
						<div
							className={`tutorial-step-${componentStepNumbers['Trending Searches']}`}
						>
							<MagellanTrendingLinkList
								onLinkClick={handleLinkListItemClick}
								links={trendingLinks}
								title="Trending Searches This Week"
								padding={10}
							/>
						</div>
					</div>
				)}
				{cloneData.clone_name !== 'gamechanger' && (
					<div style={{ margin: '10px auto', width: '67%' }}>
						<div
							className={`tutorial-step-${componentStepNumbers['Recent Searches']}`}
						>
							<MagellanTrendingLinkList
								onLinkClick={handleLinkListItemClick}
								links={JSON.parse(latestLinks)}
								title="Recent Searches"
							/>
						</div>
					</div>
				)}
			</div>
		);
	},

	getMainView(props) {
		const {
			state,
			dispatch,
			setCurrentTime,
			renderHideTabs,
			pageLoaded,
			getViewPanels,
		} = props;

		const {
			exportDialogVisible,
			searchSettings,
			prevSearchText,
			selectedDocuments,
			loading,
			rawSearchResults,
			viewNames,
			edaSearchSettings,
			currentSort,
			currentOrder,
			currentViewName
		} = state;
		const {
			allOrgsSelected,
			orgFilter,
			searchType,
			searchFields,
			allTypesSelected,
			typeFilter,
		} = searchSettings;

		const noResults = Boolean(rawSearchResults?.length === 0);
		const hideSearchResults = noResults && !loading;

		const isSelectedDocs =
			selectedDocuments && selectedDocuments.size ? true : false;
		
		return (
			<>
				{exportDialogVisible && (
					<ExportResultsDialog
						open={exportDialogVisible}
						handleClose={() =>
							setState(dispatch, { exportDialogVisible: false })
						}
						searchObject={getSearchObjectFromString(prevSearchText)}
						setCurrentTime={setCurrentTime}
						selectedDocuments={selectedDocuments}
						isSelectedDocs={isSelectedDocs}
						orgFilterString={getOrgToOrgQuery(allOrgsSelected, orgFilter)}
						typeFilterString={getTypeQuery(allTypesSelected, typeFilter)}
						orgFilter={orgFilter}
						typeFilter={typeFilter}
						getUserData={() => getUserData(dispatch)}
						isClone={true}
						cloneData={state.cloneData}
						searchType={searchType}
						searchFields={searchFields}
						edaSearchSettings={edaSearchSettings}
						sort={currentSort}
						order={currentOrder}
					/>
				)}
				{hideSearchResults && renderHideTabs(props)}
				{((!hideSearchResults && pageLoaded) || !state.replaceResults) && (
					<div style={styles.tabButtonContainer}>
						<ResultView
							context={{ state, dispatch }}
							viewNames={viewNames}
							viewPanels={getViewPanels()}
						/>
						<div style={styles.spacer} />
					</div>
				)}
				{loading && currentViewName !== 'Explorer' && (
					<div style={{ margin: '0 auto' }}>
						<LoadingIndicator customColor={gcOrange} />
					</div>
				)}
				{state.showEsQueryDialog && (
					<QueryDialog
						open={state.showEsQueryDialog}
						handleClose={() => {
							setState(dispatch, { showEsQueryDialog: false });
						}}
						query={state.query}
					/>
				)}
				{state.showEsDocDialog && (
					<DocDialog
						open={state.showEsDocDialog}
						handleClose={() => {
							setState(dispatch, { showEsDocDialog: false });
						}}
						doc={state.selectedDoc}
					/>
				)}
			</>
		);
	},

	handleCategoryTabChange(props) {
		const { tabName, state, dispatch } = props;

		if (tabName === 'all') {
			// if sort is relevance descending
			if (state.currentSort === 'Relevance' && state.currentOrder === 'desc') {
				setState(dispatch, {
					activeCategoryTab: tabName,
					resultsPage: 1,
					replaceResults: true,
					infiniteScrollPage: 1,
				});
			} else {
				// if sort isn't relevance, reset
				setState(dispatch, {
					activeCategoryTab: tabName,
					docSearchResults: [],
					resultsPage: 1,
					replaceResults: true,
					infiniteScrollPage: 1,
					currentSort: 'Relevance',
					currentOrder: 'desc',
					docsPagination: true,
				});
			}
		} else if (
			tabName === 'Documents' &&
			(state.resultsPage !== 1 ||
				(state.activeCategoryTab === 'all' &&
					(state.currentSort !== 'Relevance' || state.currentOrder !== 'desc')))
		) {
			// if pagination is wrong, or current sorting doesn't match
			setState(dispatch, {
				activeCategoryTab: tabName,
				resultsPage: 1,
				docSearchResults: [],
				replaceResults: true,
				docsPagination: true,
			});
		} else if (tabName === 'Documents') {
			setState(dispatch, { activeCategoryTab: tabName, replaceResults: false });
		}
		setState(dispatch, { activeCategoryTab: tabName, resultsPage: 1 });
	},

	getViewNames(props) {
		const viewNames = defaultMainViewHandler.getViewNames(props);
		viewNames.push({
			name: 'Graph',
			title: 'Graph View',
			id: 'gcOpenGraphView',
		});
		return viewNames;
	},

	getExtraViewPanels(props) {
		const { context } = props;
		const { state } = context;
		const viewPanels = defaultMainViewHandler.getExtraViewPanels(props);
		viewPanels.push({
			panelName: 'Graph',
			panel: (
				<div key={'graphView'}>
					{!state.loading && (
						<StyledCenterContainer showSideFilters={state.showSideFilters}>
							{state.showSideFilters && (
								<div className={'left-container'}>
									<div className={'side-bar-container'}>
										<div className={'filters-container sidebar-section-title'}>
											FILTERS
										</div>
										<GameChangerSearchMatrix context={context} />
										{state.sidebarDocTypes.length > 0 &&
											state.sidebarOrgs.length > 0 && (
											<>
												<div className={'sidebar-section-title'}>RELATED</div>
												<GameChangerSideBar
													context={context}
													cloneData={state.cloneData}
												/>
											</>
										)}
									</div>
								</div>
							)}
							<div className={'right-container'}>
								<DefaultGraphView context={context} />
							</div>
						</StyledCenterContainer>
					)}
				</div>
			),
		});

		return viewPanels;
	},

	getCardViewPanel(props) {
		const { context } = props;

		const { state, dispatch } = context;

		const {
			rawSearchResults,
			loading,
			count,
			iframePreviewLink,
			resultsPage,
			componentStepNumbers,
			hideTabs,
			isCachedResult,
			timeSinceCache,
			cloneData,
			showSideFilters,
			sidebarDocTypes,
			sidebarOrgs,
		} = state;

		let sideScroll = {
			height: '72vh',
		};
		if (!iframePreviewLink) sideScroll = {};

		const cacheTip = `Cached result from ${
			timeSinceCache > 0
				? timeSinceCache + ' hour(s) ago'
				: 'less than an hour ago'
		}`;

		const getSearchResults = (searchResultData) => {
			return _.map(searchResultData, (item, idx) => {
				return (
					<Card
						key={idx}
						item={item}
						idx={idx}
						state={state}
						dispatch={dispatch}
					/>
				);
			});
		};

		const getQAResults = () => {
			if (!state.qaResults) {
				return null;
			}
			const { question, answers } = state.qaResults;
			const wikiContainer = {
				margin: '5px',
				padding: '20px',
				backgroundColor: 'rgb(241, 245, 249)',
				fontSize: '1.2em',
				width: '100%',
			};
			// wikiResults[0]._source.text
			if (
				Permissions.isGameChangerAdmin() &&
				question !== '' &&
				answers.length > 0
			) {
				return (
					<div style={wikiContainer}>
						<strong>{question.toUpperCase()}</strong>
						<p style={{ marginTop: '10px', marginBottom: '0' }}>{answers[0]}</p>
					</div>
				);
			}
			return null;
		};

		return (
			<div key={'cardView'}>
				<div key={'cardView'} style={{ marginTop: hideTabs ? 40 : 'auto' }}>
					<div>
						<div id="game-changer-content-top" />
						{(!loading || !state.replaceResults) && (
							<StyledCenterContainer showSideFilters={showSideFilters}>
								{showSideFilters && (
									<div className={'left-container'}>
										<div className={'side-bar-container'}>
											<div
												className={'filters-container sidebar-section-title'}
											>
												FILTERS
											</div>
											<GameChangerSearchMatrix context={context} />
											{sidebarDocTypes.length > 0 && sidebarOrgs.length > 0 && (
												<>
													<div className={'sidebar-section-title'}>RELATED</div>
													<GameChangerSideBar
														context={context}
														cloneData={cloneData}
													/>
												</>
											)}
										</div>
									</div>
								)}
								<div className={'right-container'}>
									{(!hideTabs || !state.replaceResults) && <ViewHeader {...props} />}
									<div
										className={`row tutorial-step-${componentStepNumbers['Search Results Section']} card-container`}
									>
										<div
											className={'col-xs-12'}
											style={{ ...sideScroll, padding: 0 }}
										>
											<div
												className="row"
												style={{ marginLeft: 0, marginRight: 0 }}
											>
												{!loading && getQAResults()}
											</div>
											<div
												className="row"
												style={{ marginLeft: 0, marginRight: 0 }}
											>
												{(!loading || !state.replaceResults) && getSearchResults(rawSearchResults)}
											</div>
										</div>
									</div>
								</div>
							</StyledCenterContainer>
						)}
						{!iframePreviewLink && state.cloneData?.clone_name.toLowerCase() !== 'cdo' && (
							<div style={styles.paginationWrapper} className={'gcPagination'}>
								<Pagination
									activePage={resultsPage}
									itemsCountPerPage={RESULTS_PER_PAGE}
									totalItemsCount={count}
									pageRangeDisplayed={8}
									onChange={(page) => {
										trackEvent(
											getTrackingNameForFactory(state.cloneData.clone_name),
											'PaginationChanged',
											'page',
											page
										);
										setState(dispatch, { resultsPage: page, runSearch: true });
										scrollToContentTop();
									}}
								/>
							</div>
						)}
						{isCachedResult && (
							<div style={styles.cachedResultIcon}>
								<GCTooltip title={cacheTip} placement="right" arrow>
									<i style={styles.image} className="fa fa-bolt fa-2x" />
								</GCTooltip>
							</div>
						)}
						{Permissions.isGameChangerAdmin() && !loading && (
							<div style={styles.cachedResultIcon}>
								<i
									style={{ ...styles.image, cursor: 'pointer' }}
									className="fa fa-rocket"
									onClick={() =>
										setState(dispatch, { showEsQueryDialog: true })
									}
								/>
							</div>
						)}
					</div>
				</div>
			</div>
		);
	},
};

export default ASRSMainViewHandler;









// import React from 'react';
// import moment from 'moment';
// import ViewHeader from '../../mainView/ViewHeader';
// import { trackEvent } from '../../telemetry/Matomo';
// import { Typography } from '@material-ui/core';
// import { getSearchObjectFromString, getUserData, handleSaveFavoriteTopic, setState } from '../../../utils/sharedFunctions';
// import DefaultDocumentExplorer from '../default/defaultDocumentExplorer';
// import GameChangerSideBar from '../../searchMetrics/GCSideBar';
// import DefaultGraphView from '../../graph/defaultGraphView';
// import defaultMainViewHandler from '../default/defaultMainViewHandler';
// import Permissions from '@dod-advana/advana-platform-ui/dist/utilities/permissions';
// import SearchSection from '../globalSearch/SearchSection';
// import LoadingIndicator from '@dod-advana/advana-platform-ui/dist/loading/LoadingIndicator';
// import { Card } from '../../cards/GCCard';
// import GameChangerSearchMatrix from '../../searchMetrics/GCSearchMatrix';
// import Pagination from 'react-js-pagination';
// import GCTooltip from '../../common/GCToolTip';
// import GetQAResults from '../default/qaResults';
// import {
// 	getTrackingNameForFactory,
// 	StyledCenterContainer,
// 	scrollToContentTop,
// 	getOrgToOrgQuery,
// 	getTypeQuery,
// 	getQueryVariable,
// 	RESULTS_PER_PAGE,
// } from '../../../utils/gamechangerUtils';
// import DocumentIcon from '../../../images/icon/Document.png';
// import OrganizationIcon from '../../../images/icon/Organization.png';
// import ApplicationsIcon from '../../../images/icon/slideout-menu/applications icon.png';
// import {
// 	TrendingSearchContainer,
// 	RecentSearchContainer,
// 	SourceContainer,
// } from '../../mainView/HomePageStyledComponents';
// import GameChangerThumbnailRow from '../../mainView/ThumbnailRow';
// import ExportResultsDialog from '../../export/ExportResultsDialog';
// import {gcOrange} from '../../common/gc-colors';
// import {DidYouMean} from '../../searchBar/SearchBarStyledComponents';
// import ResultView from '../../mainView/ResultView';
// import QueryDialog from '../../admin/util/QueryDialog';
// import DocDialog from '../../admin/util/DocDialog';
// import MagellanTrendingLinkList from '../../common/MagellanTrendingLinkList';
// import GameChangerAPI from '../../api/gameChanger-service-api';
// import DefaultSeal from '../../mainView/img/GC Default Seal.png';
// import DefaultPub from '../../mainView/img/default_cov.png';

// const _ = require('lodash');

// const gameChangerAPI = new GameChangerAPI();

// const fullWidthCentered = {
// 	width: '100%',
// 	display: 'flex',
// 	flexDirection: 'column',
// 	justifyContent: 'center',
// 	alignItems: 'center',
// };

// const styles = {
// 	listViewBtn: {
// 		minWidth: 0,
// 		margin: '20px 0px 0px',
// 		marginLeft: 10,
// 		padding: '0px 7px 0',
// 		fontSize: 20,
// 		height: 34,
// 	},
// 	cachedResultIcon: {
// 		display: 'flex',
// 		justifyContent: 'center',
// 		padding: '0 0 1% 0',
// 	},
// 	searchResults: fullWidthCentered,
// 	paginationWrapper: fullWidthCentered,
// 	resultsCount: {
// 		fontFamily: 'Noto Sans',
// 		fontSize: 22,
// 		fontWeight: 'bold',
// 		color: '#131E43',
// 		paddingTop: '10px',
// 	},
// 	subtext: {
// 		color: '#8091A5',
// 		fontSize: 12,
// 	},
// 	containerText: {
// 		fontSize: 16,
// 		fontWeight: 'bold',
// 	},
// 	checkboxPill: {
// 		textAlign: 'center',
// 		borderRadius: '10px',
// 		paddingLeft: '10px',
// 		paddingRight: '10px',
// 		lineHeight: 1.2,
// 		fontSize: '12px',
// 		marginLeft: '10px',
// 		border: '2px solid #bdccde',
// 		backgroundColor: 'white',
// 		boxSizing: 'border-box',
// 		color: 'black',
// 		minHeight: '35px',
// 		display: 'flex',
// 		alignItems: 'center',
// 		justifyContent: 'center',
// 		cursor: 'pointer',
// 	},
// };

// const renderRecentSearches = (search, state, dispatch) => {
// 	const {
// 		searchText,
// 		publicationDateAllTime,
// 		publicationDateFilter,
// 		includeRevoked,
// 		run_at,
// 	} = search;
// 	return (
// 		<RecentSearchContainer
// 			onClick={() => {
// 				const currSearchSettings = {
// 					...state.searchSettings,
// 					publicationDateAllTime,
// 					publicationDateFilter,
// 					includeRevoked,
// 				};
// 				setState(dispatch, {
// 					searchText,
// 					runSearch: true,
// 					searchSettings: currSearchSettings,
// 				});
// 			}}
// 		>
// 			<div style={{ display: 'flex', justifyContent: 'space-between' }}>
// 				<Typography style={styles.containerText}>{searchText}</Typography>
// 			</div>
// 			<Typography style={styles.subtext}>
// 				Publication Date:
// 				{publicationDateAllTime ? 'All' : publicationDateFilter.join(' - ')}
// 			</Typography>
// 			<Typography style={styles.subtext}>
// 				Search Time:{' '}
// 				{moment(Date.parse(run_at)).utc().format('YYYY-MM-DD HH:mm UTC')}
// 			</Typography>
// 		</RecentSearchContainer>
// 	);
// };

// const getSearchResults = (searchResultData, state, dispatch) => {
// 	return _.map(searchResultData, (item, idx) => {
// 		return (
// 			<Card key={idx} item={item} idx={idx} state={state} dispatch={dispatch} />
// 		);
// 	});
// };

// const handleSources = async (state, dispatch) => {
// 	let crawlerSources = await gameChangerAPI.gcCrawlerSealData();
// 	crawlerSources = crawlerSources.data.map((item) => ({
// 		...item,
// 		imgSrc: DefaultSeal,
// 	}));
// 	setState(dispatch, { crawlerSources });
// 	try {
// 		let folder = 'crawler_images';
// 		const thumbnailList = crawlerSources.map((item) => {
// 			let filename = item.image_link.split('/').pop();
// 			return { img_filename: filename };
// 		});

// 		for (let i = 0; i < thumbnailList.length; i++) {
// 			gameChangerAPI
// 				.thumbnailStorageDownloadPOST(
// 					[thumbnailList[i]],
// 					folder,
// 					state.cloneData
// 				)
// 				.then((pngs) => {
// 					const buffers = pngs.data;
// 					buffers.forEach((buf, idx) => {
// 						if (buf.status === 'fulfilled') {
// 							crawlerSources[i].imgSrc = 'data:image/png;base64,' + buf.value;
// 							if (crawlerSources[i].image_link.split('.').pop() === 'png') {
// 								crawlerSources[i].imgSrc = 'data:image/png;base64,' + buf.value;
// 							} else if (
// 								crawlerSources[i].image_link.split('.').pop() === 'svg'
// 							) {
// 								crawlerSources[i].imgSrc =
// 									'data:image/svg+xml;base64,' + buf.value;
// 							}
// 						} else {
// 							crawlerSources[i].imgSrc = DefaultSeal;
// 						}
// 					});
// 					setState(dispatch, { crawlerSources });
// 				});
// 		}
// 	} catch (e) {
// 		//Do nothing
// 		console.log(e);
// 		setState(dispatch, { crawlerSources });
// 	}
// };

// const formatString = (text) => {
// 	let titleCase = text
// 		.split(' ')
// 		.map(function (val) {
// 			if (val.charAt(0) === '(' && val.charAt(val.length - 1) === ')') {
// 				return val;
// 			} else {
// 				return val.charAt(0).toUpperCase() + val.substr(1).toLowerCase();
// 			}
// 		})
// 		.join(' ');
// 	return _.truncate(titleCase, { length: 60, separator: /,?\.* +/ });
// };

// const getDocumentProperties = async (dispatch) => {
// 	let documentProperties = [];

// 	try {
// 		const docPropsResponse = await gameChangerAPI.getDocumentProperties();
// 		const keepList = {
// 			'display_title_s': 'Title',
// 			'display_doc_type_s': 'Document Type',
// 			'display_org_s': 'Organization',
// 			'doc_num': 'Document Number',
// 			'filename': 'Filename',
// 		}
// 		documentProperties = docPropsResponse.data.filter(field => Object.keys(keepList).indexOf(field.name) !== -1);
// 		documentProperties.forEach(field => {
// 			field.display_name = keepList[field.name];
// 		});
// 	} catch(e) {
// 		console.log(e)
// 	}

// 	setState(dispatch, {documentProperties});

// 	return documentProperties;
// }

// const checkForTinyURL = async (location) => {

// 	const tiny = getQueryVariable('tiny');

// 	if (!location || !tiny) {
// 		return false;
// 	}

// 	if (tiny) {
// 		const res = await gameChangerAPI.convertTinyURLPOST(tiny);
// 		return res.data.url;
// 	}
// }

// const getTrendingSearches = (cloneData) => {
// 	const daysAgo = 7;
// 	let internalUsers = [];
// 	let blacklist = [];

// 	gameChangerAPI.getInternalUsers().then(({data}) => {
// 		data.forEach(d => {
// 			internalUsers.push(d.username);
// 		});

// 		gameChangerAPI.getTrendingBlacklist().then(({data}) => {
// 			data.forEach(d => {
// 				blacklist.push(d.search_text);
// 			});

// 			gameChangerAPI.getAppStats({cloneData, daysAgo, internalUsers, blacklist}).then(({data}) => {
// 				localStorage.setItem(`trending${cloneData.clone_name}Searches`, JSON.stringify(data.data.topSearches.data));
// 			}).catch(e => {console.log('error with getting trending: ' + e);})

// 		}).catch(e => console.log('error with getting blacklist: ' + e));

// 	}).catch(e => {console.log('error getting internal users: ' + e)});
// }

// const handleDidYouMeanClicked = (didYouMean, state, dispatch) => {
// 	trackEvent(getTrackingNameForFactory(state.cloneData.clone_name), 'SuggestionSelected', 'DidYouMean');
// 	setState(dispatch, { searchText: didYouMean, runSearch: true });
// }

// const ASRSMainViewHandler = {
// 	async handlePageLoad(props) {
// 		/* const {
// 			state,
// 			dispatch,
// 			history,
// 			searchHandler,
// 		} = props;
		
// 		if (state.runSearch) return;

// 		const documentProperties = await getDocumentProperties(dispatch);
// 		let newState = { ...state, documentProperties };

	
// 		// redirect the page if using tinyurl
// 		const url = await checkForTinyURL(window.location);
// 		if (url) {
// 			history.replace(`#/${url}`);
// 			//setPageLoaded(false);
// 			//return;
// 		}
// 		else if (url === null) {
// 			///history.replace(state.cloneData.clone_data.url);
// 			return;
// 		}
		
// 		try {
// 			getTrendingSearches(state.cloneData);
// 		} catch (e) {
// 			// Do nothing
// 		}

// 		try {
// 			gameChangerAPI.recentSearchesPOST(state.cloneData.clone_name).then(({data}) => {
// 				setState(dispatch, {recentSearches: data});
// 			});
// 		} catch (e) {
// 			// Do nothing
// 		}
		
// 		try {
// 			// gameChangerAPI.gcCrawlerTrackerData().then(({data}) => {
// 			// 	const names = data.docs.map(d=>d.crawler_name)
// 			// 	setState(dispatch, {crawlerSources: names});
// 			// });
// 			// let crawlerSources = await gameChangerAPI.gcCrawlerSealData();
// 			// setState(dispatch, {crawlerSources: crawlerSources.data});
// 		} catch(e) {
// 			// Do nothing
// 		}
		
// 		// fetch ES index
// 		try{
// 			const esIndex = await gameChangerAPI.getElasticSearchIndex();
// 			setState(dispatch, { esIndex: esIndex.data });
// 		} catch (e){
// 			console.log(e);
// 		}
		
// 		try {
// 			getUserData(dispatch);
// 		} catch(e) {
// 			console.log(e);
// 		}

// 		const parsedURL = searchHandler.parseSearchURL(newState);
// 		if (parsedURL.searchText) {
// 			newState = { ...newState, ...parsedURL, runSearch: true };
// 			setState(dispatch, newState);
			
// 			searchHandler.setSearchURL(newState);
// 		} */

// 		const { state, dispatch } = props;
// 		await defaultMainViewHandler.handlePageLoad(props);
// 		let topics = [];
// 		try {
// 			const { data } = await gameChangerAPI.getHomepageEditorData();
// 			data.forEach((obj) => {
// 				if (obj.key === 'homepage_topics') {
// 					topics = JSON.parse(obj.value);
// 				}
// 			});
// 		} catch (e) {
// 			// Do nothing
// 		}

// 		setState(dispatch, { adminTopics: topics });
// 		handleSources(state, dispatch);
// 	},
	
// 	renderHideTabs(props) {
// 		const { state, dispatch, searchHandler } = props;
// 		const {
// 			adminTopics,
// 			cloneData,
// 			crawlerSources,
// 			prevSearchText,
// 			resetSettingsSwitch,
// 			didYouMean,
// 			loading,
// 			userData,
// 			recentSearches,
// 		} = state;

// 		const showDidYouMean = didYouMean && !loading;
// 		const trendingStorage =
// 			localStorage.getItem(`trending${cloneData.clone_name}Searches`) || '[]';

// 		if (prevSearchText) {
// 			if (!resetSettingsSwitch) {
// 				dispatch({ type: 'RESET_SEARCH_SETTINGS' });
// 				setState(dispatch, {
// 					resetSettingsSwitch: true,
// 					showSnackbar: true,
// 					snackBarMsg: 'Search settings reset',
// 				});
// 				if (searchHandler) searchHandler.setSearchURL(state);
// 			}
// 		}

// 		const { favorite_topics = [], favorite_searches = [] } = userData;

// 		// const agencyPublications = ['Department of the United States Army', 'Department of the United States Navy', 'Department of the United States Marine Corp', 'Department of United States Air Force']

// 		let trendingLinks = [];
// 		if (trendingStorage) {
// 			JSON.parse(trendingStorage).forEach((search) => {
// 				if (search.search) {
// 					trendingLinks.push({
// 						search: search.search.replaceAll('&#039;', '"'),
// 						count: search.count,
// 						favorite: false,
// 					});
// 				}
// 			});
// 		}

// 		trendingLinks.forEach(({ search }, idx) => {
// 			favorite_searches.forEach((fav) => {
// 				if (fav.search_text === search) {
// 					trendingLinks[idx].favorite = true;
// 				}
// 			});
// 		});

// 		recentSearches.forEach((search, idx) => {
// 			favorite_searches.forEach((fav) => {
// 				recentSearches[idx].favorite = fav.tiny_url === search.tiny_url;
// 			});
// 		});

// 		const favTopicNames = favorite_topics.map((item) =>
// 			item.topic_name.toLowerCase()
// 		);
// 		adminTopics.forEach((topic, idx) => {
// 			if (
// 				_.find(favTopicNames, (item) => {
// 					return item === topic.name.toLowerCase();
// 				})
// 			) {
// 				adminTopics[idx].favorite = true;
// 			} else {
// 				adminTopics[idx].favorite = false;
// 			}
// 		});

// 		return (
// 			<div style={{ marginTop: '40px' }}>
// 				{prevSearchText && (
// 					<div style={{ margin: '10px auto', width: '67%' }}>
// 						<div style={styles.resultsCount}>
// 							<p style={{ fontWeight: 'normal', display: 'inline' }}>
// 								Looks like we don't have any matches for{' '}
// 							</p>
// 							"{prevSearchText}"
// 						</div>
// 					</div>
// 				)}
// 				{showDidYouMean && (
// 					<div
// 						style={{
// 							margin: '10px auto',
// 							fontSize: '25px',
// 							width: '67%',
// 							paddingLeft: 'auto',
// 						}}
// 					>
// 						Did you mean{' '}
// 						<DidYouMean
// 							onClick={() =>
// 								handleDidYouMeanClicked(didYouMean, state, dispatch)
// 							}
// 						>
// 							{didYouMean}
// 						</DidYouMean>
// 						?
// 					</div>
// 				)}
// 				<div style={{ margin: '0 70px 0 70px' }}>
// 					<GameChangerThumbnailRow
// 						links={trendingLinks}
// 						title={'Trending Searches'}
// 						width={'300px'}
// 					>
// 						{trendingLinks.map(({ search, favorite, count }, idx) => (
// 							<TrendingSearchContainer
// 								onClick={() =>
// 									setState(dispatch, { searchText: search, runSearch: true })
// 								}
// 							>
// 								<div
// 									style={{ display: 'flex', justifyContent: 'space-between' }}
// 								>
// 									<Typography style={styles.containerText}>{`#${idx + 1} ${
// 										search.length < 20
// 											? search
// 											: search.substring(0, 22) + '...'
// 									}`}</Typography>
// 								</div>
// 								<Typography style={styles.subtext}>
// 									<i
// 										className="fa fa-search"
// 										style={{ width: 16, height: 15 }}
// 									/>
// 									{`${count} searches this week`}
// 								</Typography>
// 							</TrendingSearchContainer>
// 						))}
// 					</GameChangerThumbnailRow>
// 					<GameChangerThumbnailRow
// 						links={adminTopics}
// 						title={'Editor\'s Choice: Top Topics'}
// 						width="100px"
// 						style={{ marginLeft: '0' }}
// 					>
// 						{adminTopics.map((item, idx) => (
// 							<div
// 								style={styles.checkboxPill}
// 								onClick={() => {
// 									trackEvent(
// 										getTrackingNameForFactory(cloneData.clone_name),
// 										'TopicOpened',
// 										item.name
// 									);
// 									window.open(
// 										`#/gamechanger-details?cloneName=${
// 											cloneData.clone_name
// 										}&type=topic&topicName=${item.name.toLowerCase()}`
// 									);
// 								}}
// 							>
// 								{item.name}
// 								<i
// 									className={item.favorite ? 'fa fa-star' : 'fa fa-star-o'}
// 									style={{
// 										color: item.favorite ? '#E9691D' : 'rgb(224,224,224)',
// 										marginLeft: 10,
// 										cursor: 'pointer',
// 										fontSize: 20,
// 									}}
// 									onClick={(event) => {
// 										event.stopPropagation();
// 										handleSaveFavoriteTopic(
// 											item.name.toLowerCase(),
// 											'',
// 											!item.favorite,
// 											dispatch
// 										);
// 									}}
// 								/>
// 							</div>
// 						))}
// 					</GameChangerThumbnailRow>
// 					<GameChangerThumbnailRow
// 						links={crawlerSources}
// 						title="Sources"
// 						width="300px"
// 					>
// 						{crawlerSources.length > 0 &&
// 							crawlerSources[0].imgSrc &&
// 							crawlerSources.map((source) => (
// 								<SourceContainer
// 									onClick={() => {
// 										trackEvent(
// 											getTrackingNameForFactory(cloneData.clone_name),
// 											'SourceOpened',
// 											source.data_source_s
// 										);
// 										window.open(
// 											`#/gamechanger-details?cloneName=${
// 												cloneData.clone_name
// 											}&type=source&sourceName=${source.data_source_s.toLowerCase()}`
// 										);
// 									}}
// 								>
// 									<img src={source.imgSrc} alt={'crawler seal'}></img>
// 									<Typography
// 										style={{
// 											...styles.containerText,
// 											color: '#313541',
// 											alignSelf: 'center',
// 											marginLeft: '20px',
// 										}}
// 									>
// 										{source.data_source_s}
// 									</Typography>
// 								</SourceContainer>
// 							))}
// 						{crawlerSources.length === 0 && (
// 							<div className="col-xs-12" style={{ height: '140px' }}>
// 								<LoadingIndicator
// 									customColor={gcOrange}
// 									inline={true}
// 									containerStyle={{ height: '140px', textAlign: 'center' }}
// 								/>
// 							</div>
// 						)}
// 					</GameChangerThumbnailRow>
// 					<GameChangerThumbnailRow
// 						links={recentSearches}
// 						title="Recent Searches"
// 						width="300px"
// 					>
// 						{recentSearches.map((search) =>
// 							renderRecentSearches(search, state, dispatch)
// 						)}
// 					</GameChangerThumbnailRow>
// 				</div>
// 			</div>
// 		);
// 	},
	
// 	/* getMainView(props) {
// 		const {
// 			state,
// 			dispatch,
// 			setCurrentTime,
// 			renderHideTabs,
// 			pageLoaded,
// 			getViewPanels
// 		} = props;
		
// 		const {exportDialogVisible, searchSettings, prevSearchText, selectedDocuments, loading, rawSearchResults, viewNames, edaSearchSettings, currentSort, currentOrder} = state;
// 		const {allOrgsSelected, orgFilter, searchType, searchFields, allTypesSelected, typeFilter,} = searchSettings;
		
// 		const noResults = Boolean(rawSearchResults?.length === 0);
// 		const hideSearchResults = noResults && !loading;

// 		const isSelectedDocs = selectedDocuments && selectedDocuments.size ? true : false;

// 		return (
// 				<>
// 					{exportDialogVisible && (
// 						<ExportResultsDialog
// 							open={exportDialogVisible}
// 							handleClose={() => setState(dispatch, { exportDialogVisible: false })}
// 							searchObject={getSearchObjectFromString(prevSearchText)}
// 							setCurrentTime={setCurrentTime}
// 							selectedDocuments={selectedDocuments}
// 							isSelectedDocs={isSelectedDocs}
// 							orgFilterString={getOrgToOrgQuery(allOrgsSelected, orgFilter)}
// 							typeFilterString={getTypeQuery(allTypesSelected, typeFilter)}
// 							orgFilter={orgFilter}
// 							typeFilter={typeFilter}
// 							getUserData={() => getUserData(dispatch)}
// 							isClone = {true}
// 							cloneData = {state.cloneData}
// 							searchType={searchType}
// 							searchFields={searchFields}
// 							edaSearchSettings={edaSearchSettings}
// 							sort={currentSort}
// 							order={currentOrder}
// 						/>
// 					)}
// 					{loading &&
// 						<div style={{ margin: '0 auto' }}>
// 							<LoadingIndicator customColor={gcOrange} />
// 						</div>
// 					}
// 					{hideSearchResults && renderHideTabs(props)}
// 					{(!hideSearchResults && pageLoaded) &&
// 						<div style={styles.tabButtonContainer}>
// 							<ResultView context={{state, dispatch}} viewNames={viewNames} viewPanels={getViewPanels()} />
// 							<div style={styles.spacer} />
// 						</div>
// 					}
// 					{state.showEsQueryDialog && (
// 						<QueryDialog
// 							open={state.showEsQueryDialog}
// 							handleClose={() => { setState(dispatch, { showEsQueryDialog: false }) }}
// 							query={state.query}
// 						/>
// 					)}
// 					{state.showEsDocDialog && (
// 						<DocDialog
// 							open={state.showEsDocDialog}
// 							handleClose={() => { setState(dispatch, { showEsDocDialog: false }) }}
// 							doc={state.selectedDoc}
// 						/>
// 					)}
// 				</>
// 			);
// 	}, */
	
// 	getMainView(props) {
// 		return defaultMainViewHandler.getMainView(props);
// 	},

// 	handleCategoryTabChange(props) {
// 		const {
// 			tabName,
// 			state,
// 			dispatch
// 		} = props;
		
// 		if (tabName === 'all'){
// 			// if sort is relevance descending
// 			if(state.currentSort === 'Relevance' && state.currentOrder === 'desc'){
// 				setState(dispatch,{
// 					activeCategoryTab:tabName,
// 					resultsPage: 1,
// 					replaceResults: true,
// 					infiniteScrollPage: 1
// 				})
// 			} else {
// 				// if sort isn't relevance, reset
// 				setState(dispatch,{
// 					activeCategoryTab:tabName,
// 					docSearchResults:[],
// 					resultsPage: 1,
// 					replaceResults: true,
// 					infiniteScrollPage: 1,
// 					currentSort: 'Relevance',
// 					currentOrder: 'desc',
// 					docsPagination: true
// 				})
// 			}

// 		} else if (tabName === 'Documents' && (state.resultsPage !== 1 || (state.activeCategoryTab === 'all' && (state.currentSort !== 'Relevance' || state.currentOrder !== 'desc')))){ // if pagination is wrong, or current sorting doesn't match
// 			setState(dispatch,{activeCategoryTab:tabName, resultsPage: 1, docSearchResults: [], replaceResults: true, docsPagination: true});
// 		} else if (tabName === 'Documents'){
// 			setState(dispatch,{activeCategoryTab:tabName, replaceResults: false});
// 		}
// 		setState(dispatch,{activeCategoryTab:tabName, resultsPage: 1});
// 	},
	
// 	getViewNames(props) {
// 		const viewNames = defaultMainViewHandler.getViewNames(props);
// 		viewNames.push({
// 			name: 'Graph',
// 			title: 'Graph View',
// 			id: 'gcOpenGraphView',
// 		});
// 		return viewNames;
// 	},
	
// 	getExtraViewPanels(props) {
// 		const { context } = props;
// 		const { state } = context;
// 		const viewPanels = defaultMainViewHandler.getExtraViewPanels(props);
// 		viewPanels.push({
// 			panelName: 'Graph',
// 			panel: (
// 				<div key={'graphView'}>
// 					{!state.loading && (
// 						<StyledCenterContainer showSideFilters={state.showSideFilters}>
// 							{state.showSideFilters && (
// 								<div className={'left-container'}>
// 									<div className={'side-bar-container'}>
// 										<div className={'filters-container sidebar-section-title'}>
// 											FILTERS
// 										</div>
// 										<GameChangerSearchMatrix context={context} />
// 										{state.sidebarDocTypes.length > 0 &&
// 											state.sidebarOrgs.length > 0 && (
// 											<>
// 												<div className={'sidebar-section-title'}>RELATED</div>
// 												<GameChangerSideBar
// 													context={context}
// 													cloneData={state.cloneData}
// 												/>
// 											</>
// 										)}
// 									</div>
// 								</div>
// 							)}
// 							<div className={'right-container'}>
// 								<DefaultGraphView context={context} />
// 							</div>
// 						</StyledCenterContainer>
// 					)}
// 				</div>
// 			),
// 		});

// 		return viewPanels;
// 	},

// 	getCardViewPanel(props) {
// 		const { context } = props;
// 		const { state, dispatch } = context;
// 		const {
// 			activeCategoryTab,
// 			cloneData,
// 			componentStepNumbers,

// 			count,
// 			docSearchResults,
// 			resultsPage,
// 			docsLoading,
// 			docsPagination,

// 			entityCount,
// 			entitySearchResults,
// 			entityPage,

// 			topicCount,
// 			topicSearchResults,
// 			topicPage,
// 			hideTabs,
// 			iframePreviewLink,
// 			isCachedResult,
// 			loading,
// 			selectedCategories,
// 			showSideFilters,
// 			sidebarOrgs,
// 			sidebarDocTypes,
// 			timeSinceCache,
// 			searchSettings,
// 		} = state;

// 		let sideScroll = {
// 			height: '72vh',
// 		};
// 		if (!iframePreviewLink) sideScroll = {};
// 		const cacheTip = `Cached result from ${
// 			timeSinceCache > 0
// 				? timeSinceCache + ' hour(s) ago'
// 				: 'less than an hour ago'
// 		}`;

// 		const getQAResults = () => {
// 			if(!state.qaResults) {
// 				return null;
// 			} 
// 			const { question, answers }  = state.qaResults;
// 			const wikiContainer = {
// 				margin: '5px',
// 				padding: '20px',
// 				backgroundColor: 'rgb(241, 245, 249)',
// 				fontSize: '1.2em',
// 				width: '100%'
// 			}
// 			// wikiResults[0]._source.text
// 			if (Permissions.isGameChangerAdmin() && question !== '' && answers.length > 0){
// 				return (
// 					<div style={wikiContainer}>
// 						<strong>{question.toUpperCase()}</strong>
// 						<p style={{marginTop: '10px', marginBottom: '0'}}>{answers[0]}</p>
// 					</div>);
// 			} 
// 			return null;
// 		}

// 		return (
// 			<div key={'cardView'}>
// 				<div key={'cardView'} style={{ marginTop: hideTabs ? 40 : 'auto' }}>
// 					<div>
// 						<div id="game-changer-content-top" />
// 						{!loading && (
// 							<StyledCenterContainer showSideFilters={showSideFilters}>
// 								{showSideFilters && (
// 									<div className={'left-container'}>
// 										<div className={'side-bar-container'}>
// 											<GameChangerSearchMatrix context={context} />
// 											{sidebarDocTypes.length > 0 && sidebarOrgs.length > 0 && (
// 												<>
// 													<div className={'sidebar-section-title'}>RELATED</div>
// 													<GameChangerSideBar
// 														context={context}
// 														cloneData={cloneData}
// 													/>
// 												</>
// 											)}
// 										</div>
// 									</div>
// 								)}
// 								<div className={'right-container'}>
// 									{!hideTabs && <ViewHeader {...props} />}
// 									<div
// 										className={`row tutorial-step-${componentStepNumbers['Search Results Section']} card-container`}
// 										style={{ padding: 0 }}
// 									>
// 										<div
// 											className={'col-xs-12'}
// 											style={{ ...sideScroll, padding: 0 }}
// 										>
// 											<div
// 												className="row"
// 												style={{ marginLeft: 0, marginRight: 0, padding: 0 }}
// 											>
// 												{!loading && getQAResults()}
// 											</div>
// 											{!loading &&
// 												(activeCategoryTab === 'Documents' ||
// 													activeCategoryTab === 'all') &&
// 												selectedCategories['Documents'] && (
// 												<div
// 													className={'col-xs-12'}
// 													style={{
// 														marginTop: 10,
// 														marginLeft: 0,
// 														marginRight: 0,
// 													}}
// 												>
// 													{!searchSettings.isFilterUpdate ? (
// 														<SearchSection
// 															section={'Documents'}
// 															color={'#131E43'}
// 															icon={DocumentIcon}
// 														>
// 															{activeCategoryTab === 'all' ? (
// 																<>
// 																	{!docsLoading && !docsPagination ? (
// 																		getSearchResults(
// 																			docSearchResults,
// 																			state,
// 																			dispatch
// 																		)
// 																	) : (
// 																		<div className="col-xs-12">
// 																			<LoadingIndicator
// 																				customColor={gcOrange}
// 																			/>
// 																		</div>
// 																	)}
// 																	<div className="gcPagination col-xs-12 text-center">
// 																		<Pagination
// 																			activePage={resultsPage}
// 																			itemsCountPerPage={RESULTS_PER_PAGE}
// 																			totalItemsCount={count}
// 																			pageRangeDisplayed={8}
// 																			onChange={async (page) => {
// 																				trackEvent(
// 																					getTrackingNameForFactory(
// 																						cloneData.clone_name
// 																					),
// 																					'PaginationChanged',
// 																					'page',
// 																					page
// 																				);
// 																				setState(dispatch, {
// 																					docsLoading: true,
// 																					resultsPage: page,
// 																					docsPagination: true,
// 																				});
// 																			}}
// 																		/>
// 																	</div>
// 																</>
// 															) : (
// 																<>
// 																	{getSearchResults(
// 																		docSearchResults,
// 																		state,
// 																		dispatch
// 																	)}
// 																	{docsPagination && (
// 																		<div className="col-xs-12">
// 																			<LoadingIndicator
// 																				customColor={gcOrange}
// 																				containerStyle={{
// 																					margin: '-100px auto',
// 																				}}
// 																			/>
// 																		</div>
// 																	)}
// 																</>
// 															)}
// 														</SearchSection>
// 													) : (
// 														<div className="col-xs-12">
// 															<LoadingIndicator customColor={gcOrange} />
// 														</div>
// 													)}
// 												</div>
// 											)}

// 											{entitySearchResults &&
// 												entitySearchResults.length > 0 &&
// 												(activeCategoryTab === 'Organizations' ||
// 													activeCategoryTab === 'all') &&
// 												selectedCategories['Organizations'] && (
// 												<div
// 													className={'col-xs-12'}
// 													style={{
// 														marginTop: 10,
// 														marginLeft: 0,
// 														marginRight: 0,
// 													}}
// 												>
// 													<SearchSection
// 														section={'Organizations'}
// 														color={'#376f94'}
// 														icon={OrganizationIcon}
// 													>
// 														{getSearchResults(
// 															entitySearchResults,
// 															state,
// 															dispatch
// 														)}
// 														<div className="gcPagination col-xs-12 text-center">
// 															<Pagination
// 																activePage={entityPage}
// 																itemsCountPerPage={RESULTS_PER_PAGE}
// 																totalItemsCount={entityCount}
// 																pageRangeDisplayed={8}
// 																onChange={async (page) => {
// 																	trackEvent(
// 																		getTrackingNameForFactory(
// 																			cloneData.clone_name
// 																		),
// 																		'PaginationChanged',
// 																		'page',
// 																		page
// 																	);
// 																	setState(dispatch, {
// 																		entitiesLoading: true,
// 																		entityPage: page,
// 																		entityPagination: true,
// 																	});
// 																}}
// 															/>
// 														</div>
// 													</SearchSection>
// 												</div>
// 											)}

// 											{topicSearchResults &&
// 												topicSearchResults.length > 0 &&
// 												(activeCategoryTab === 'Topics' ||
// 													activeCategoryTab === 'all') &&
// 												selectedCategories['Topics'] && (
// 												<div
// 													className={'col-xs-12'}
// 													style={{
// 														marginTop: 10,
// 														marginLeft: 0,
// 														marginRight: 0,
// 													}}
// 												>
// 													<SearchSection
// 														section={'Topics'}
// 														color={'#4da593'}
// 														icon={ApplicationsIcon}
// 													>
// 														{getSearchResults(
// 															topicSearchResults,
// 															state,
// 															dispatch
// 														)}
// 														<div className="gcPagination col-xs-12 text-center">
// 															<Pagination
// 																activePage={topicPage}
// 																itemsCountPerPage={RESULTS_PER_PAGE}
// 																totalItemsCount={topicCount}
// 																pageRangeDisplayed={8}
// 																onChange={async (page) => {
// 																	trackEvent(
// 																		getTrackingNameForFactory(
// 																			cloneData.clone_name
// 																		),
// 																		'PaginationChanged',
// 																		'page',
// 																		page
// 																	);
// 																	// setState(dispatch, {entitiesLoading: true, entityPage: page, entityPagination: true });
// 																}}
// 															/>
// 														</div>
// 													</SearchSection>
// 												</div>
// 											)}
// 										</div>
// 									</div>
// 								</div>
// 							</StyledCenterContainer>
// 						)}
// 						{isCachedResult && (
// 							<div style={styles.cachedResultIcon}>
// 								<GCTooltip title={cacheTip} placement="right" arrow>
// 									<i
// 										style={{ cursor: 'pointer' }}
// 										className="fa fa-bolt fa-2x"
// 									/>
// 								</GCTooltip>
// 							</div>
// 						)}
// 						{Permissions.isGameChangerAdmin() && !loading && (
// 							<div style={styles.cachedResultIcon}>
// 								<i
// 									style={{ cursor: 'pointer' }}
// 									className="fa fa-rocket"
// 									onClick={() =>
// 										setState(dispatch, { showEsQueryDialog: true })
// 									}
// 								/>
// 							</div>
// 						)}
// 					</div>
// 				</div>
// 			</div>
// 		);
// 	}
// };

// export default ASRSMainViewHandler;