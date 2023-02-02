const policyCardHandler = require('../modules/policy/policyCardHandler');
const hermesCardHandler = require('../modules/hermes/hermesCardHandler');
const asrsCardHandler = require('../modules/asrs/asrsCardHandler');
const imCardHandler = require('../modules/im/imCardHandler');
const imCardHandler_pdf_viewer = require('../modules/im/imCardHandler_pdf_viewer');
const cdoCardHandler = require('../modules/cdo/cdoCardHandler');
const globalSearchCardHandler = require('../modules/globalSearch/globalSearchCardHandler');
const edaCardHandler = require('../modules/eda/edaCardHandler');
const defaultCardHandler = require('../modules/default/defaultCardHandler');
const budgetSearchCardHandler = require('../modules/budgetSearch/budgetSearchCardHandler');
const jexnetCardHandler = require('../modules/jexnet/jexnetCardHandler');

class CardFactory {
	constructor(module) {
		try {
			switch (module) {
				case 'policy/policyCardHandler':
					this.handler = policyCardHandler;
					break;
				case 'hermes/hermesCardHandler':
					this.handler = hermesCardHandler;
					break;
				case 'asrs/asrsCardHandler':
					this.handler = asrsCardHandler;
					break;
				case 'im/imCardHandler':
					this.handler = imCardHandler;
					break;
				case 'im/imCardHandler_pdf_viewer':
					this.handler = imCardHandler_pdf_viewer;
					break;
				case 'cdo/cdoCardHandler':
					this.handler = cdoCardHandler;
					break;
				case 'globalSearch/globalSearchCardHandler':
					this.handler = globalSearchCardHandler;
					break;
				case 'eda/edaCardHandler':
					this.handler = edaCardHandler;
					break;
				case 'budgetSearch/budgetSearchCardHandler':
					this.handler = budgetSearchCardHandler;
					break;
				case 'jexnet/jexnetCardHandler':
					this.handler = jexnetCardHandler;
					break;
				default:
					this.handler = defaultCardHandler;
					break;
			}
		} catch (err) {
			this.handler = defaultCardHandler;
		}
	}

	createHandler() {
		return this.handler.default;
	}
}

export default CardFactory;
