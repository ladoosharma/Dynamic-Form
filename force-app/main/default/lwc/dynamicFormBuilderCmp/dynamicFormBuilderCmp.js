import { LightningElement, api, wire, track } from "lwc";
import getCurrentTemplate from "@salesforce/apex/DynamicFormCreatorController.getCurrentTemplate";
import { fireEvent /*, registerListener*/ } from "c/pubsub";
import { createRecord, updateRecord } from "lightning/uiRecordApi";
import { refreshApex } from "@salesforce/apex";
import { CurrentPageReference } from "lightning/navigation";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import FORM_TYPE from "@salesforce/schema/Form_Template__c.Form_Type__c";
import FORM_SECTION_TYPE from "@salesforce/schema/Form_Template__c.Form_Section_Type__c";
const NONE_PICKLIST = { value: "", label: "--None--" };
export default class DynamicFormBuilderCmp extends LightningElement {
  @api formTemplateId;
  tempFormId;
  @track formTemplate = {};
  formTemplateObj;
  draggedElement;
  connectedCallback() {
    this.tempFormId = this.templateId;
  }
  @wire(CurrentPageReference) pageRef;
  @wire(getCurrentTemplate, { templateId: "$tempFormId" })
  templateData(returnData) {
    this.formTemplateObj = returnData;
    const { data, error } = returnData;
    if (data) {
      console.debug(data);
      this.formTemplate = JSON.parse(JSON.stringify(data));
    }
    if (error) {
      //handle error here
      console.error(error);
    }
  }
  @wire(getPicklistValues, {
    fieldApiName: FORM_TYPE,
    recordTypeId: "012000000000000AAA"
  })
  formTypePicklist;
  @wire(getPicklistValues, {
    fieldApiName: FORM_SECTION_TYPE,
    recordTypeId: "012000000000000AAA"
  })
  formSectionTypePicklist;
  get getFormSectionType() {
    return this.formSectionTypePicklist
      ? this.formSectionTypePicklist.data
        ? this.formSectionTypePicklist.data.values.map(({ value, label }) => {
            return { value, label };
          })
        : [NONE_PICKLIST]
      : [NONE_PICKLIST];
  }
  get getFormType() {
    return this.formTypePicklist.data
      ? this.formTypePicklist.data
        ? this.formTypePicklist.data.values.map(({ value, label }) => {
            return { value, label };
          })
        : [NONE_PICKLIST]
      : [NONE_PICKLIST];
  }
  handleDragOverAction(evt) {
    if (this.draggedElement === "action") {
      evt.preventDefault();
    }
  }
  handleDragOverSection(evt) {
    if (
      this.draggedElement === "section" ||
      this.draggedElement === "field" ||
      this.draggedElement === "formula"
    ) {
      evt.preventDefault();
    }
  }
  setData(evt) {
    this.draggedElement = evt.currentTarget.dataset.element;
    this.highlightRespectiveDiv();
    fireEvent(this.pageRef, "draggedElement", this.draggedElement);
  }
  highlightRespectiveDiv() {
    const actionIcon = this.template.querySelectorAll(
      'lightning-icon[data-id="action"]'
    );
    const noActionIcon = this.template.querySelectorAll(
      'lightning-icon[data-id="nonAction"]'
    );
    const actionDropArea = this.template.querySelector(".templateActionRegion");
    const nonActionDropArea = this.template.querySelector(
      ".sectionPlaceholder"
    );
    if (this.draggedElement === "action") {
      actionDropArea.classList.remove("backgroundNotAllowed");
      actionDropArea.classList.add("backgroundAllowed");
      nonActionDropArea.classList.remove("backgroundAllowed");
      nonActionDropArea.classList.add("backgroundNotAllowed");
      actionIcon.forEach((each) => {
        if (each.iconName === "utility:add") {
          each.classList.add("slds-show");
          each.classList.remove("slds-hide");
        }
        if (each.iconName === "utility:ban") {
          each.classList.remove("slds-show");
          each.classList.add("slds-hide");
        }
      });
      noActionIcon.forEach((each) => {
        if (each.iconName === "utility:add") {
          each.classList.add("slds-hide");
          each.classList.remove("slds-show");
        }
        if (each.iconName === "utility:ban") {
          each.classList.remove("slds-hide");
          each.classList.add("slds-show");
        }
      });
    } else if (
      this.draggedElement === "section" ||
      this.draggedElement === "field" ||
      this.draggedElement === "formula"
    ) {
      actionDropArea.classList.remove("backgroundAllowed");
      actionDropArea.classList.add("backgroundNotAllowed");
      nonActionDropArea.classList.remove("backgroundNotAllowed");
      nonActionDropArea.classList.add("backgroundAllowed");
      actionIcon.forEach((each) => {
        if (each.iconName === "utility:add") {
          each.classList.add("slds-hide");
          each.classList.remove("slds-show");
        }
        if (each.iconName === "utility:ban") {
          each.classList.remove("slds-hide");
          each.classList.add("slds-show");
        }
      });
      noActionIcon.forEach((each) => {
        if (each.iconName === "utility:add") {
          each.classList.add("slds-show");
          each.classList.remove("slds-hide");
        }
        if (each.iconName === "utility:ban") {
          each.classList.remove("slds-show");
          each.classList.add("slds-hide");
        }
      });
    } else if (this.draggedElement === "") {
      actionDropArea.classList.remove("backgroundAllowed");
      actionDropArea.classList.remove("backgroundNotAllowed");
      nonActionDropArea.classList.remove("backgroundNotAllowed");
      nonActionDropArea.classList.remove("backgroundAllowed");
      actionIcon.forEach((each) => {
        each.classList.remove("slds-show");
        each.classList.add("slds-hide");
      });
      noActionIcon.forEach((each) => {
        each.classList.remove("slds-show");
        each.classList.add("slds-hide");
      });
    }
  }
  resetDragElement() {
    this.draggedElement = "";
    this.highlightRespectiveDiv();
    fireEvent(this.pageRef, "draggedElement", this.draggedElement);
  }
  saveSection() {
    const targetObj = {
      fields: Object.keys(this.formTemplate).reduce((prevObj, eachFld) => {
        if (typeof this.formTemplate[eachFld] !== "object") {
          prevObj[eachFld] = this.formTemplate[eachFld];
        }
        return prevObj;
      }, {})
    };
    if (!this.templateId) {
      targetObj.apiName = "Dynamic_Forms__Form_Template__c";
    }
    (this.formTemplateId ? updateRecord(targetObj) : createRecord(targetObj))
      .then((data) => {
        this.tempFormId = data.id;
        refreshApex(this.formTemplateObj);
      })
      .catch((error) => {
        /** throw some error here */
        console.error(error);
      });
  }
  setFormData(evt) {
    this.formTemplate[evt.target.dataset.field] = evt.target.value;
  }
}
