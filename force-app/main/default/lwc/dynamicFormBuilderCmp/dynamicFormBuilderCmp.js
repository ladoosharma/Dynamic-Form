import { LightningElement, api, wire, track } from "lwc";
import getCurrentTemplate from "@salesforce/apex/DynamicFormCreatorController.getCurrentTemplate";
//import { fireEvent /*, registerListener*/ } from "c/pubsub";
import { createRecord, updateRecord } from "lightning/uiRecordApi";
import { refreshApex } from "@salesforce/apex";
import { CurrentPageReference } from "lightning/navigation";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import FORM_TYPE from "@salesforce/schema/Form_Template__c.Form_Type__c";
import FORM_SECTION_TYPE from "@salesforce/schema/Form_Template__c.Form_Section_Type__c";
import DYNAMIC_CHANNEL from "@salesforce/messageChannel/dynamicFormChannel__c";
import { publish, MessageContext } from "lightning/messageService";
const NONE_PICKLIST = { value: "", label: "--None--" };
export default class DynamicFormBuilderCmp extends LightningElement {
  @api formTemplateId = "a005j00000Pp284AAB";
  tempFormId;
  @track formTemplate = {};
  @wire(MessageContext)
  messageContext;
  activeTab;
  formTemplateObj;
  draggedElement;
  openEditFormTemplate = false;
  sectionTypeObj = {
    isAccordion: false,
    isVertical: false,
    isHorizontal: false
  };
  connectedCallback() {
    this.tempFormId = this.formTemplateId;
    this.openEditFormTemplate =
      this.tempFormId !== undefined && this.tempFormId !== "";
    if (!this.pageRef) {
      this.pageRef = { attributes: { url: window.location.href } };
    }
  }
  @wire(CurrentPageReference) pageRef;
  @wire(getCurrentTemplate, { templateId: "$tempFormId" })
  templateData(returnData) {
    this.formTemplateObj = returnData;
    const { data, error } = returnData;
    if (data) {
      console.debug(data);
      this.formTemplate = JSON.parse(JSON.stringify(data));
      this.formTemplate.formSections = this.formTemplate.formSections.sort(
        (a, b) => {
          return (
            a.formSection.Dynamic_Forms__Section_Number__c -
            b.formSection.Dynamic_Forms__Section_Number__c
          );
        }
      );
      this.formTemplate.formSections.forEach((eachSec, index) => {
        eachSec.formSection.tempId = eachSec.formSection.Id;
        eachSec.formSection.isActiveSection = index === 0;
        eachSec.childFormSection = eachSec.childFormSection.sort((a, b) => {
          return (
            a.formSection.Dynamic_Forms__Section_Number__c -
            b.formSection.Dynamic_Forms__Section_Number__c
          );
        });
        eachSec.childFormSection.forEach((eachChild, indexChild) => {
          eachChild.formSection.tempId = eachChild.formSection.Id;
          eachChild.formSection.isActiveSection = indexChild === 0;
        });
      });
      this.sectionTypeObj.isAccordion =
        this.formTemplate.formTemplate.Dynamic_Forms__Form_Section_Type__c ===
        "Accordion";
      this.sectionTypeObj.isVertical =
        this.formTemplate.formTemplate.Dynamic_Forms__Form_Section_Type__c ===
        "Vertical Tab";
      this.sectionTypeObj.isHorizontal =
        this.formTemplate.formTemplate.Dynamic_Forms__Form_Section_Type__c ===
        "Horizontal Tab";
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
    evt.dataTransfer.setData("draggedElement", this.draggedElement);
    //this.highlightRespectiveDiv();
    //fireEvent(this.pageRef, "draggedElement", this.draggedElement);
    publish(this.messageContext, DYNAMIC_CHANNEL, {
      whatIsDragged: this.draggedElement
    });
  }
  resetDragElement() {
    this.draggedElement = "";
    //this.highlightRespectiveDiv();
    //fireEvent(this.pageRef, "draggedElement", this.draggedElement);
    publish(this.messageContext, DYNAMIC_CHANNEL, {
      whatIsDragged: this.draggedElement
    });
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
        this.openEditFormTemplate = false;
      })
      .catch((error) => {
        /** throw some error here */
        console.error(error);
        this.openEditFormTemplate = false;
      });
  }
  setFormData(evt) {
    this.formTemplate[evt.target.dataset.field] = evt.target.value;
  }
  handleDropOfElement(evt) {
    const draggedObject = evt.detail;
    if (draggedObject) {
      switch (draggedObject.whatIsDropped) {
        case "section":
          this.createSection(draggedObject);
          break;
        case "action":
          this.createAction(draggedObject);
          break;
        default:
          break;
      }
    }
  }
  createSection(droppedObj) {
    const temId = Math.random().toString();
    this.formTemplate.formSections.forEach((each) => {
      each.formSection.isActiveSection = false;
    });
    if (
      this.formTemplate &&
      this.formTemplate.formTemplate.Id === droppedObj.recordId
    ) {
      //section is dropped on the top
      this.formTemplate.formSections.unshift({
        formSection: {
          Dynamic_Forms__Form_Template__c: this.formTemplate.formTemplate.Id,
          Dynamic_Forms__Section_Number__c: 1,
          Name: `Section 1`,
          isActiveSection: true
        }
      });
    } else if (
      this.formTemplate &&
      this.formTemplate.formTemplate.Id !== droppedObj.recordId
    ) {
      //section is dropped somewhere in below sections
      let indexOnDropped;
      this.formTemplate.formSections.forEach((sec, index) => {
        if (sec.formSection.Id === droppedObj.recordId) {
          indexOnDropped = index;
        }
      });
      if (indexOnDropped !== undefined) {
        this.formTemplate.formSections.splice(indexOnDropped + 1, 0, {
          formSection: {
            Dynamic_Forms__Form_Template__c: this.formTemplate.formTemplate.Id,
            Dynamic_Forms__Section_Number__c: indexOnDropped + 2,
            Name: `Section ${indexOnDropped + 2}`,
            isActiveSection: true
          }
        });
      }
    }
    this.template.querySelector("c-dynamic-tab-cmp").iteratorObject =
      this.formTemplate.formSections;
    this.activeTab = temId;
  }
  createAction(droppedObj) {
    if (this.formTemplate && droppedObj) {
      //action is dropped on the section
    }
  }
}
