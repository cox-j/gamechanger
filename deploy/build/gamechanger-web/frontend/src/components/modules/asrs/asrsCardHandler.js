import React from 'react';
import GCTooltip from '../../common/GCToolTip';
import { KeyboardArrowRight } from '@material-ui/icons';
import styled from 'styled-components';
import {
	capitalizeFirst,
	CARD_FONT_SIZE,
	getSubTypes,
	getTrackingNameForFactory,
	getTypeDisplay,
} from '../../../utils/gamechangerUtils';
import SimpleTable from '../../common/SimpleTable';
import { CardButton } from '../../common/CardButton';
import { primary } from '../../common/gc-colors';
import { trackEvent } from '../../telemetry/Matomo';
import sanitizeHtml from 'sanitize-html';

const colWidth = {
	maxWidth: '900px',
	whiteSpace: 'nowrap',
	overflow: 'hidden',
	textOverflow: 'ellipsis',
};

const styles = {
	footerButtonBack: {
		margin: '0 10px 0 0 ',
		padding: '8px 12px',
	},
	viewMoreChevron: {
		fontSize: 14,
		color: primary,
		fontWeight: 'normal',
		marginLeft: 5,
	},
	viewMoreButton: {
		fontSize: 16,
		color: primary,
		fontWeight: 'bold',
		cursor: 'pointer',
		minWidth: 60,
	},
	collectionContainer: {
		margin: '1em',
		overflow: 'auto',
	},
	bodyImg: {
		width: 75,
		margin: '10px',
	},
	bodyText: {
		margin: '10px',
		fontSize: '14px',
	},
	row: {
		display: 'flex',
		justifyContent: 'space-between',
		flexWrap: 'wrap',
	},
	bodyContainer: {
		display: 'flex',
		height: '100%',
		flex: 1,
		flexDirection: 'column',
		backgroundColor: 'rgb(238, 241, 242)',
		padding: '10px 0',
	},
};

const docViewTitleStyle = "font-size: 20px;font-weight: bold;line-height: 1.25;padding: 5px;text-align: justify;";
const docViewNarrativeStyle = "white-space: pre-wrap;font-size: 16px;line-height: 1.25;padding: 25px 5px 5px 5px;text-align: justify;";
const docViewHighlight = "background-color: #E9691D; padding: 1px 4px; color: white; font-style: normal;"

const auxDisplayBackFields = [
	'report_date', 'keyw_5', 'summary_topics_display', 'text_topics_display', 'taxonomies_display'
];
const auxDisplayTitleField = 'title';
const auxDisplayFrontFields = ['title', 'narrative'];
const auxDisplayFieldJSONMap = {
	title: 'Subject:',
	narrative: 'Narrative: ',
	doc_type: 'Report Type:',
	doc_num: 'Report Number:',
	summary_topics_display: 'Subject Topics:',
	text_topics_display: 'Narrative Topics:',
	report_date: 'Report Month:',
	taxonomies_display: 'ASRS Taxonomies:',
	keyw_5: 'Keywords'
};
const auxDisplayLeftSubtitleText = 'doc_type';
const auxDisplayRightSubtitleField = 'doc_num';

const StyledFrontCardHeader = styled.div`
	font-size: 1.2em;
	display: inline-block;
	color: black;
	margin-bottom: 0px;
	background-color: ${({ intelligentSearch }) =>
		intelligentSearch ? '#9BB1C8' : 'white'};
	font-weight: bold;
	font-family: Montserrat;
	height: ${({ listView }) => (listView ? 'fit-content' : '59px')};
	padding: ${({ listView }) => (listView ? '0px' : '5px')};
	margin-left: ${({ listView }) => (listView ? '10px' : '0px')};
	margin-right: ${({ listView }) => (listView ? '10px' : '0px')};

	.title-text-selected-favorite-div {
		max-height: ${({ listView }) => (listView ? '' : '50px')};
		height: ${({ listView }) => (listView ? '35px' : '')};
		overflow: hidden;
		display: flex;
		justify-content: space-between;

		.title-text {
			cursor: pointer;
			display: ${({ docListView }) => (docListView ? 'flex' : '')};
			alignitems: ${({ docListView }) => (docListView ? 'top' : '')};
			height: ${({ docListView }) => (docListView ? 'fit-content' : '')};
			overflow-wrap: ${({ listView }) => listView ? '' : 'anywhere'};

			.text {
				margin-top: ${({ listView }) => (listView ? '10px' : '0px')};
			}

			.list-view-arrow {
				display: inline-block;
				margin-top: 7px;
			}
		}

		.selected-favorite {
			display: inline-block;
			font-family: 'Noto Sans';
			font-weight: 400;
			font-size: ${CARD_FONT_SIZE}px;
			margin-top: ${({ listView }) => (listView ? '2px' : '0px')};
		}
	}

	.list-view-sub-header {
		font-size: 0.8em;
		display: flex;
		color: black;
		margin-bottom: 0px;
		margin-top: 0px;
		background-color: ${({ intelligentSearch }) =>
		intelligentSearch ? '#9BB1C8' : 'white'};
		font-family: Montserrat;
		height: 24px;
		justify-content: space-between;
	}
`;

const StyledFrontCardSubHeader = styled.div`
	display: flex;
	position: relative;

	.sub-header-one {
		color: ${({ typeTextColor }) =>
		typeTextColor ? typeTextColor : '#ffffff'};
		background-color: ${({ docTypeColor }) =>
		docTypeColor ? docTypeColor : '#000000'};
		width: 50%;
		padding: 8px;
		display: flex;
		align-items: center;

		img {
			width: 25px;
			margin: 0px 10px 0px 0px;
		}
	}

	.sub-header-two {
		width: 50%;
		color: white;
		padding: 10px 8px 8px;
		background-color: ${({ docOrgColor }) =>
		docOrgColor ? docOrgColor : '#000000'};
	}
`;

// given a start and end, replace the text between with replacement text
String.prototype.replaceBetween = function (start, end, replacement) {
	return this.substring(0, start) + replacement + this.substring(end);
};

const clickFn = (title, reportDate, narrative, pageHits = []) => {
	// replace non-newline whitespace with spaces
	let newTitle = title.replaceAll(/[^\S\r\n]/g, ' ');
	let newNarrative = narrative.replaceAll(/[^\S\r\n]/g, ' ');

	let titleWithHighlight = newTitle;
	let narrativeWithHighlight = newNarrative;

	// handle the search highlights
	// for (let i = 0; i < pageHits.length; i += 1) {
	// 	const pageHit = pageHits[i];
	// 	const hit = pageHit.snippet.replaceAll('<em>', '').replaceAll('</em>', '');
	// 	const hitNoSpace = hit.replaceAll(/\s/g, '');

	// 	// check newTitle for hit
	// 	const titleHitIndexNoSpace = newTitle.replaceAll(/\s/g, '').indexOf(hitNoSpace);
	// 	if (titleHitIndexNoSpace >= 0) {
	// 		// find start position of the pageHit with potential spaces in the title
	// 		let spacesBeforeIndex = 0;
	// 		let j = 0;
	// 		for (; j < newTitle.length, j - spacesBeforeIndex < titleHitIndexNoSpace; j += 1) {
	// 			if (/\s/.test(newTitle.charAt(j))) {
	// 				spacesBeforeIndex += 1;
	// 			}
	// 		}
	// 		const titleHitIndex = j;

	// 		// find end position of the pageHit without considering spaces
	// 		const titleHitEndIndexNoSpace = newTitle.replaceAll(/\s/g, '').split('').reverse().join('').indexOf(hitNoSpace.split('').reverse().join(''));
	// 		// find titleHitEndIndex with pottential spaces in the title
	// 		spacesBeforeIndex = 0;
	// 		j = 0;
	// 		for (; j < newTitle.length, j - spacesBeforeIndex < titleHitEndIndexNoSpace; j += 1) {
	// 			if (/\s/.test(newTitle.charAt(j))) {
	// 				spacesBeforeIndex += 1;
	// 			}
	// 		}
	// 		const titleHitEndIndex = newTitle.length - j;

	// 		// replace section between start and end position with pageHit (which has search highlights)
	// 		titleWithHighlight = titleWithHighlight.replaceBetween(
	// 			titleHitIndex, titleHitEndIndex, pageHit.snippet.replaceAll('<em>', `<em style="${docViewHighlight}">`)
	// 		);
	// 	}

	// 	// check narrative for hit
	// 	const narrativeHitIndexNoSpace = newNarrative.replaceAll(/\s/g, '').indexOf(hitNoSpace);
	// 	if (narrativeHitIndexNoSpace >= 0) {
	// 		// find start position of the pageHit with potential spaces in the narrative
	// 		let spacesBeforeIndex = 0;
	// 		let j = 0;
	// 		for (; j < newNarrative.length, j - spacesBeforeIndex < narrativeHitIndexNoSpace; j += 1) {
	// 			if (/\s/.test(newNarrative.charAt(j))) {
	// 				spacesBeforeIndex += 1;
	// 			}
	// 		}
	// 		const narrativeHitIndex = j;

	// 		// find end position of the pageHit without considering spaces
	// 		const narrativeHitEndIndexNoSpace = newNarrative.replaceAll(/\s/g, '').split('').reverse().join('').indexOf(hitNoSpace.split('').reverse().join(''));
	// 		// find titleHitEndIndex with pottential spaces in the Narrative
	// 		spacesBeforeIndex = 0;
	// 		j = 0;
	// 		for (; j < newNarrative.length, j - spacesBeforeIndex < narrativeHitEndIndexNoSpace; j += 1) {
	// 			console.log(newNarrative.charAt(j))
	// 			if (/\s/.test(newNarrative.charAt(j))) {
	// 				console.log('add space')
	// 				spacesBeforeIndex += 1;
	// 			}
	// 		}
	// 		const narrativeHitEndIndex = newNarrative.length - j;

	// 		// replace section between start and end position with pageHit (which has search highlights)
	// 		narrativeWithHighlight = narrativeWithHighlight.replaceBetween(
	// 			narrativeHitIndex, narrativeHitEndIndex, pageHit.snippet.replaceAll('<em>', `<em style="${docViewHighlight}">`)
	// 		);
	// 	}
	// }
	let data = `
		<div style="${docViewTitleStyle}">${titleWithHighlight}</div>
		<div style="${docViewNarrativeStyle}">${reportDate}</div>
		<div style="${docViewNarrativeStyle}"> ${narrativeWithHighlight} </div>
	`;
	let myWindow = window.open('data:text/html,', '_blank', '');
	myWindow.document.write(data);
	myWindow.focus();
};

const Row = ({ label, value, minWidth = 'inherit' }) => {
	return (
		<div style={styles.row}>
			<div style={{ fontWeight: 'bold', minWidth }}>{label}</div>
			<div style={{ marginLeft: '12px', flex: 1 }}>{value}</div>
		</div>
	);
};

const makeRows = (
	fieldsArr = [],
	itemWithValues = {},
	displayNameMap,
	forTable = false
) => {

	const rows = [];
	for (const fieldName of fieldsArr) {
		let cleanFieldName = fieldName; //.replace(/_1|_2/g, '');
		const displayName = displayNameMap?.[fieldName] ?? fieldName;
		let value = itemWithValues[cleanFieldName] ?? 'Unknown';

		// if (cleanFieldName === 'body') {
		// 	let splitValue = value.split('-----');
		// 	value = splitValue[splitValue.length - 1];
		// }

		// shorten text longer than x length
		// if (value.length > 230) {
		// 	value = value.substring(0, 230) + '...';
		// }

		if (value) {
			if (forTable) {
				const row = {};
				row['Key'] = displayName.replace(/:/g, '');
				row['Value'] = value;
				rows.push(row);
			} else {
				rows.push(
					<Row
						key={cleanFieldName}
						label={displayName}
						value={value}
						minWidth={40}
					/>
				);
			}
		}
	}

	return rows;
};

const renderHighlights = (
	highlights,
	capitalizeFirst,
	hoveredHit,
	setHoveredHit
) => {
	const fontSize = 12;
	const highlightList = [];

	let firstHighlight = {
		first: true,
		highlight: '',
		text: '',
	};

	for (const field in highlights) {
		const highlight = highlights[field];
		let label = 1;
		for (const text of highlight) {
			const highlightLabel = `${field} ${label}`;
			if (firstHighlight.first) {
				firstHighlight.first = false;
				firstHighlight.highlight = highlightLabel;
				firstHighlight.text = text;
			}
			highlightList.push(
				<>
					<div
						key={highlightLabel}
						style={{
							display: 'flex',
							justifyContent: 'space-between',
							alignItems: 'center',
							paddingRight: '5px',
							paddingLeft: '5px',
							borderTop: '1px solid rgb(189, 189, 189)',
							cursor: 'pointer',
							color: '#386F94',
							backgroundColor: 'white',
							...(hoveredHit === highlightLabel && {
								backgroundColor: '#E9691D',
								color: 'white',
							}),
						}}
						onMouseEnter={() => {
							setHoveredHit(highlightLabel);
						}}
					>
						<span style={{ fontSize }}>{`${capitalizeFirst(field)} ${label}`}</span>
						<i
							className="fa fa-chevron-right"
							style={{ marginLeft: 10, fontSize, color: 'white' }}
						/>
					</div>
				</>
			);
			label += 1;
		}
	}
	if (hoveredHit === 0) {
		setHoveredHit(firstHighlight.highlight);
	}

	return highlightList;
};

const getDisplayTitle = (item) => {
	return `${item[auxDisplayTitleField]}`;
};

const asrsCardHandler = {
	document: {
		getDisplayTitle: (item) => {
			return getDisplayTitle(item);
		},
		getCardHeader: (props) => {
			const { state, item, graphView } = props;

			const title = getDisplayTitle(item);
			// $ to indicate use text as is
			let type = item[auxDisplayLeftSubtitleText];
			let org = `$${item[auxDisplayRightSubtitleField]}`;

			type = `${type}`;

			const docListView = state.listView && !graphView;

			return (
				<StyledFrontCardHeader
					listView={state.listView}
					docListView={docListView}
					intelligentSearch={false}
				>
					<div className={'title-text-selected-favorite-div'}>
						<GCTooltip title={title} placement="top" arrow>
							<div
								className={'title-text'}
								onClick={docListView ? () => clickFn(item.title, item.report_date, item.narrative, item.pageHits) : () => { }}
							>
								<div className={'text'}>{title}</div>
								{docListView && (
									<div className={'list-view-arrow'}>
										<KeyboardArrowRight
											style={{ color: 'rgb(56, 111, 148)', fontSize: 32 }}
										/>
									</div>
								)}
							</div>
						</GCTooltip>
					</div>
					{docListView && (
						<div className={'list-view-sub-header'}>
							<p>
								{' '}
								{getSubTypes(type)} | {getTypeDisplay(org)}{' '}
							</p>
						</div>
					)}
				</StyledFrontCardHeader>
			);
		},

		getCardSubHeader: (props) => {
			const { item, state, toggledMore } = props;

			// $ to indicate use text as is
			let type = item[auxDisplayLeftSubtitleText];
			// let org = `$${capitalizeFirst(auxDisplayRightSubtitleField)}: ${
			// 	item[auxDisplayRightSubtitleField]
			// }`;
			let org = `${item[auxDisplayRightSubtitleField]}`;
			let typeColor = 'black';

			if (type === 'Z') {
				typeColor = '#BD0000';
			} else if (type === 'O') {
				typeColor = '#ff8d00';
			} else if (type === 'P') {
				typeColor = '#c9c600';
			} else if (type === 'R') {
				typeColor = 'forestgreen';
			}

			// type = `$${capitalizeFirst(auxDisplayLeftSubtitleText)}: ${type}`;
			type = `${type}`;

			const orgColor = '#9BB1C8';

			return (
				<>
					{!state.listView && !toggledMore && (
						<StyledFrontCardSubHeader
							typeTextColor={'white'}
							docTypeColor={typeColor}
							docOrgColor={orgColor}
						>
							<div className={'sub-header-one'}>{getSubTypes(type)}</div>
							<div className={'sub-header-two'}>{getTypeDisplay(org)}</div>
						</StyledFrontCardSubHeader>
					)}
				</>
			);
		},

		getCardFront: (props) => {
			const { item, hoveredHit, setHoveredHit } = props;

			let hoveredSnippet = '';
			if (hoveredHit) {
				const sliceIndex = hoveredHit.match(/\d+$/).index;
				const type = hoveredHit.slice(0, sliceIndex).trim();
				const index = hoveredHit.slice(sliceIndex) - 1;
				hoveredSnippet = item.highlight[type][index];
			}
			const highlightText = hoveredSnippet;

			let displayNameMap;
			if (auxDisplayFieldJSONMap) {
				try {
					displayNameMap = auxDisplayFieldJSONMap;
				} catch (e) {
					console.log(e);
				}
			}

			const frontItems = makeRows(
				auxDisplayFrontFields,
				item,
				displayNameMap,
				false
			);

			return (
				<div style={styles.bodyContainer}>
					{frontItems}
					{item && item.highlight && (
						<div
							style={{ display: 'flex', height: '100%', margin: '5px 0 0 0' }}
						>
							<div
								style={{
									minWidth: 100,
									height: 190,
									border: '1px solid rgb(189, 189, 189)',
									borderTop: 0,
									overflow: 'scroll',
								}}
							>
								{renderHighlights(
									item.highlight,
									capitalizeFirst,
									hoveredHit,
									setHoveredHit,
								)}
							</div>
							<div
								style={{
									height: 150,
									border: '1px solid rgb(189, 189, 189)',
									borderLeft: 0,
									width: '100%',
								}}
							>
								<blockquote
									className="searchdemo-blockquote"
									dangerouslySetInnerHTML={{
										__html: sanitizeHtml(highlightText),
									}}
								></blockquote>
							</div>
						</div>
					)}
				</div>
			);
		},

		getCardBack: (props) => {
			const { item } = props;

			let displayNameMap;
			if (auxDisplayFieldJSONMap) {
				try {
					displayNameMap = auxDisplayFieldJSONMap;
				} catch (e) {
					console.log(e);
				}
			}

			const backItemsTable = makeRows(
				auxDisplayBackFields,
				item,
				displayNameMap,
				true
			);

			return (
				<SimpleTable
					tableClass={'magellan-table'}
					zoom={1}
					headerExtraStyle={{ backgroundColor: '#313541', color: 'white' }}
					rows={backItemsTable}
					height={'auto'}
					dontScroll={true}
					colWidth={colWidth}
					disableWrap={true}
					title={'Metadata'}
					hideHeader={false}
				/>
			);
		},

		getFooter: (props) => {
			const { item, cloneName, toggledMore, setToggledMore } = props;

			return (
				<>
					<CardButton
						target={'_blank'}
						style={{ ...styles.footerButtonBack, CARD_FONT_SIZE }}
						href={'#'}
						onClick={(e) => {
							e.preventDefault();
							clickFn(item.title, item.report_date, item.narrative, item.pageHits);
						}}
					>
						Open
					</CardButton>
					<div
						style={{ ...styles.viewMoreButton }}
						onClick={() => {
							trackEvent(
								getTrackingNameForFactory(cloneName),
								'CardInteraction',
								'flipCard',
								toggledMore ? 'Overview' : 'More'
							);
							setToggledMore(!toggledMore);
						}}
					>
						{toggledMore ? 'Overview' : 'More'}
						<i
							style={styles.viewMoreChevron}
							className="fa fa-chevron-right"
							aria-hidden="true"
						/>
					</div>
				</>
			);
		},

		getCardExtras: (props) => {
			return <></>;
		},

		getFilename: (item) => {
			return '';
		},
	},

	publication: {
		getCardHeader: (props) => {
			return <></>;
		},

		getCardSubHeader: (props) => {
			return <></>;
		},

		getCardFront: (props) => {
			return <></>;
		},

		getCardBack: (props) => {
			return <></>;
		},

		getFooter: (props) => {
			return <></>;
		},

		getCardExtras: (props) => {
			return <></>;
		},

		getFilename: (item) => {
			return '';
		},
	},

	entity: {
		getCardHeader: (props) => {
			return <></>;
		},

		getCardSubHeader: (props) => {
			return <></>;
		},

		getCardFront: (props) => {
			return <></>;
		},

		getCardBack: (props) => {
			return <></>;
		},

		getFooter: (props) => {
			return <></>;
		},

		getCardExtras: (props) => {
			return <></>;
		},

		getFilename: (item) => {
			return '';
		},
	},

	topic: {
		getCardHeader: (props) => {
			return <></>;
		},

		getCardSubHeader: (props) => {
			return <></>;
		},

		getCardFront: (props) => {
			return <></>;
		},

		getCardBack: (props) => {
			return <></>;
		},

		getFooter: (props) => {
			return <></>;
		},

		getCardExtras: (props) => {
			return <></>;
		},

		getFilename: (item) => {
			return '';
		},
	},
};

export default asrsCardHandler;
