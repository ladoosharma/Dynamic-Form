import { LightningElement, api, wire } from "lwc";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import SECTION_GRID from "@salesforce/schema/Form_Section__c.Section_Grid__c";
import SECTION_TYPE from "@salesforce/schema/Form_Section__c.Section_Type__c";
const NONE_PICKLIST = { value: "", label: "--None--" };
import createSection from "@salesforce/apex/DynamicFormCreatorController.createSection";
import deleteSectionAndDependencies from "@salesforce/apex/DynamicFormCreatorController.deleteSectionAndDependencies";
import { publish, MessageContext } from "lightning/messageService";
import DYNAMIC_CHANNEL from "@salesforce/messageChannel/dynamicFormChannel__c";

export default class DynamicFormSectionCmp extends LightningElement {
  sectionData;
  tempSectionObject;
  @wire(MessageContext) messageContext;
  @api sectionIndex;
  openEditBox = false;
  hasChildSection;
  currentActiveSectionNumber;
  sectionTypeObj = {
    isAccordion: false,
    isVertical: false,
    isHorizontal: false
  };
  @wire(getPicklistValues, {
    fieldApiName: SECTION_GRID,
    recordTypeId: "012000000000000AAA"
  })
  getGridType;
  @wire(getPicklistValues, {
    fieldApiName: SECTION_TYPE,
    recordTypeId: "012000000000000AAA"
  })
  getSectionType;
  isRendered;
  @api set eachSectionData(section) {
    //delete section.spreadObj.eachSectionData;
    this.sectionData = JSON.parse(section);
    //delete this.sectionData
    this.tempSectionObject = this.sectionData.formSection;
    this.openEditBox = !/^[a-zA-Z0-9]{18}$/.test(
      this.sectionData.formSection.Id
    );
    this.sectionTypeObj.isAccordion =
      this.sectionData.formSection.Dynamic_Forms__Section_Type__c ===
      "Accordion";
    this.sectionTypeObj.isVertical =
      this.sectionData.formSection.Dynamic_Forms__Section_Type__c ===
      "Vertical Tab";
    this.sectionTypeObj.isHorizontal =
      this.sectionData.formSection.Dynamic_Forms__Section_Type__c ===
      "Horizontal Tab";
    this.hasChildSection = this.sectionData.childFormSection
      ? this.sectionData.childFormSection.length > 0
      : false;
  }
  get eachSectionData() {
    return this.sectionData;
  }
  get sectionType() {
    return this.getSectionType.data
      ? this.getSectionType.data
        ? this.getSectionType.data.values.map(({ value, label }) => {
            return { value, label };
          })
        : [NONE_PICKLIST]
      : [NONE_PICKLIST];
  }
  get gridType() {
    return this.getGridType.data
      ? this.getGridType.data
        ? this.getGridType.data.values.map(({ value, label }) => {
            return { value, label };
          })
        : [NONE_PICKLIST]
      : [NONE_PICKLIST];
  }
  setData(evt) {
    const clonedData = JSON.parse(JSON.stringify(this.tempSectionObject));
    clonedData[evt.target.dataset.field] = evt.target.value;
    this.tempSectionObject = clonedData;
  }
  saveSection() {
    //save the section data by calling the controller
    this.openEditBox = false;
    createSection({
      sectionObject: JSON.stringify(this.tempSectionObject)
    })
      .then(() => {
        //fir event to refresh the data
        publish(this.messageContext, DYNAMIC_CHANNEL, {
          refreshData: true
        });
      })
      .catch((error) => {
        console.error(error);
      });

    //send event to refresh the data from server
  }
  handleCancelSave() {
    this.openEditBox = false;
    //send custom event to parent for deleting the section if Id is not present
  }
  handleDropOfElement(evt) {
    const draggedSection = evt.detail;
    if (draggedSection) {
      const idOfRecord = draggedSection.recordId;
      if (this.sectionData.formSection.Id === idOfRecord) {
        //dropped on parent section
        //check what is dropped and then do the process
        console.debug(draggedSection.whatIsDropped);
      } else {
        //dropped on child section
        const sectionDroppedOn = this.sectionData.childFormSection.find(
          (eachChild) => {
            return eachChild.formSection.Id === idOfRecord;
          }
        );
        if (sectionDroppedOn) {
          //check what is dropped and do the process
          let indexOnDropped;
          this.sectionData.childFormSection.forEach((sec, index) => {
            if (sec.formSection.Id === draggedSection.recordId) {
              indexOnDropped = index;
            }
          });
          if (indexOnDropped !== undefined) {
            this.sectionData.childFormSection.splice(indexOnDropped + 1, 0, {
              formSection: {
                Dynamic_Forms__Parent_Form_Section__c:
                  this.sectionData.formSection.Id,
                Dynamic_Forms__Section_Number__c: indexOnDropped + 2,
                Dynamic_Forms__Form_Template__c:
                  this.sectionData.formSection.Dynamic_Forms__Form_Template__c,
                Name: `Section ${indexOnDropped + 2}`,
                isActiveSection: true,
                Id: Math.random().toFixed(18).toString()
              }
            });
            this.template.querySelector("c-dynamic-tab-cmp").iteratorObject =
              this.sectionData.childFormSection;
          }
        }
      }
    }
  }
  @api enableEdit() {
    this.openEditBox = true;
  }
  @api delteTheTab() {
    //delete the tab and all the dependencies with it and refresh the tabs
    deleteSectionAndDependencies({
      sectionId: this.eachSectionData.formSection.Id
    })
      .then(() => {
        publish(this.messageContext, DYNAMIC_CHANNEL, {
          refreshData: true
        });
      })
      .catch((error) => {
        console.error(error);
      });
  }
}
