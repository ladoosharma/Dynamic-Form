import { LightningElement, api, wire } from 'lwc';
import getActionRecord from '@salesforce/apex/DynamicFormCreatorController.getActionRecord';
import { updateRecord, createRecord } from 'lightning/uiRecordApi';
export default class CreateApexAuraActionCmp extends LightningElement {
    @api actionId;
    @api formObject;
    @api isFieldAction = false;
    @api isSectionAction = false;
    @api isTemplateAction = false;
    whereClauseForAction;
    relatedFieldLabel;
    relatedActionObject;
    relatedObjectId;
    formActionData;
    openNewActionPopup;
    connectedCallback(){
        this.whereClauseForAction = ` AND Object_Related_To__c = '${this.formObject}'`;
        this.relatedActionObject = (this.isFieldAction)?'Form_Field__c':this.isSectionAction?'Form_Section__c':this.isTemplateAction?'Form_Template__c':'';
        this.relatedFieldLabel = (this.isFieldAction)?'Field Related to':this.isSectionAction?'Section Related to':this.isTemplateAction?'Template Related to':'';
        if(!this.actionId){
            this.formActionData = {};
        }
    }
    @wire(getActionRecord, {actionId: '$actionId'})
    actionFetch({data, error}){
        if(data){
            this.formActionData = data;
            this.relatedActionObject = (data.Field_Action__c)?'Form_Field__c':data.Section_Action__c?'Form_Section__c':data.Form_Template__c?'Form_Template__c':'';
            this.relatedFieldLabel = (data.Field_Action__c)?'Field Related to':data.Section_Action__c?'Section Related to':data.Form_Template__c?'Template Related to':'';
            this.relatedObjectId = (data.Field_Action__c)?data.Field_Action__c:data.Section_Action__c?data.Section_Action__c:data.Form_Template__c?data.Form_Template__c:'';
        }
        if(error){
            //handle error here
        }
    }
    lookupRecord(evt){
        const target = evt.target;
        
    }
    submitform(){
        if(this.actionId){
            /**update the record , or create a new one */
        }else{

        }
    }
    createNewAction(){
        this.openNewActionPopup = true;
    }
    handleClose(){
        this.openNewActionPopup = false;
    }
    handleSubmit(){
        const actioncmp = this.template.querySelector('c-custom-lookup-lwc[data-id="actionName"]');
        this.template.querySelector('c-create-new-dynamic-action').submitForm()
        .then((data) => {
            if(actioncmp){
                actioncmp.defaultRecordId = data.id;
                this.openNewActionPopup = false;
            }
        })
        .catch((error) => {
            console.error(error);
            this.openNewActionPopup = false;
        })
    }

}