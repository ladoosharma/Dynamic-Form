import { LightningElement, api, wire } from 'lwc';
import getActionRecord from '@salesforce/apex/DynamicFormCreatorController.getActionRecord';
export default class CreateApexAuraActionCmp extends LightningElement {
    @api actionId;

    @wire(getActionRecord, {actionId: '$actionId'})
    actionFetch({data, error}){
        if(data){

        }
        if(error){
            
        }
    }

}