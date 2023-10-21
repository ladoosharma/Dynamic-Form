import { LightningElement, api, wire, track } from "lwc";
import getActionRecord from "@salesforce/apex/DynamicFormCreatorController.getActionRecord";
//import { updateRecord, createRecord } from "lightning/uiRecordApi";
export default class CreateApexAuraActionCmp extends LightningElement {
  @api actionId;
  @api formObject;
  @api isFieldAction = false;
  @api isSectionAction = false;
  @api isTemplateAction = false;
  whereClauseForAction;
  relatedFieldLabel;
  relatedActionObject;
  lookupFieldApiName;
  relatedObjectId;
  @track formActionData;
  openNewActionPopup;
  connectedCallback() {
    this.whereClauseForAction = ` AND Dynamic_Forms__Object_Related_To__c = '${this.formObject}'`;
    this.relatedActionObject = this.isFieldAction
      ? "Dynamic_Forms__Form_Field__c"
      : this.isSectionAction
      ? "Dynamic_Forms__Form_Section__c"
      : this.isTemplateAction
      ? "Dynamic_Forms__Form_Template__c"
      : "";
    this.lookupFieldApiName = this.isFieldAction
      ? "Dynamic_Forms__Field_Action__c"
      : this.isSectionAction
      ? "Dynamic_Forms__Section_Action__c"
      : this.isTemplateAction
      ? "Dynamic_Forms__Form_Template__c"
      : "";
    this.relatedFieldLabel = this.isFieldAction
      ? "Field Related to"
      : this.isSectionAction
      ? "Section Related to"
      : this.isTemplateAction
      ? "Template Related to"
      : "";
    if (!this.actionId) {
      this.formActionData = {};
    }
  }
  @wire(getActionRecord, { actionId: "$actionId" })
  actionFetch({ data, error }) {
    if (data) {
      this.formActionData = data;
      this.relatedActionObject = data.Dynamic_Forms__Field_Action__c
        ? "Dynamic_Forms__Form_Field__c"
        : data.Dynamic_Forms__Section_Action__c
        ? "Dynamic_Forms__Form_Section__c"
        : data.Dynamic_Forms__Form_Template__c
        ? "Dynamic_Forms__Form_Template__c"
        : "";
      this.relatedFieldLabel = data.Dynamic_Forms__Field_Action__c
        ? "Field Related to"
        : data.Dynamic_Forms__Section_Action__c
        ? "Section Related to"
        : data.Dynamic_Forms__Form_Template__c
        ? "Template Related to"
        : "";
      this.relatedObjectId = data.Dynamic_Forms__Field_Action__c
        ? data.Dynamic_Forms__Field_Action__c
        : data.Dynamic_Forms__Section_Action__c
        ? data.Dynamic_Forms__Section_Action__c
        : data.Dynamic_Forms__Form_Template__c
        ? data.Dynamic_Forms__Form_Template__c
        : "";
    }
    if (error) {
      //handle error here
    }
  }
  lookupRecord(evt) {
    const recordSelected = evt.detail.selectedRecord;
    const fieldToBeMappedWith = evt.target.dataset.id;
    if (fieldToBeMappedWith) {
      this.formActionData[fieldToBeMappedWith] = recordSelected
        ? recordSelected.Id
        : "";
    }
    if (
      fieldToBeMappedWith === "Dynamic_Forms__Apex_Aura_Action__c" &&
      recordSelected
    ) {
      this.formActionData.Dynamic_Forms__Argument_Mapping__c =
        recordSelected.additionalFields.find((e) => {
          return e.apiName === "Dynamic_Forms__Argument_List__c";
        }).value;
    } else if (fieldToBeMappedWith === "Dynamic_Forms__Apex_Aura_Action__c") {
      this.formActionData.Dynamic_Forms__Argument_Mapping__c = "";
    }
  }
  submitform() {
    if (this.actionId) {
      /**update the record , or create a new one */
    } else {
      /** create new record */
    }
  }
  createNewAction() {
    this.openNewActionPopup = true;
  }
  handleClose() {
    this.openNewActionPopup = false;
  }
  handleSubmit() {
    this.template
      .querySelector("c-create-new-dynamic-action")
      .submitForm()
      .then((data) => {
        if (data) {
          this.formActionData.Dynamic_Forms__Apex_Aura_Action__c = data.id;
          this.formActionData.Dynamic_Forms__Argument_Mapping__c =
            data.fields.Dynamic_Forms__Argument_List__c.value;
          this.openNewActionPopup = false;
        }
      })
      .bind(this)
      .catch((error) => {
        console.error(error);
        this.openNewActionPopup = false;
      });
  }
}
