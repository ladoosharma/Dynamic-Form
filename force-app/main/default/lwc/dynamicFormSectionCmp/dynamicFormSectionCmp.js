import { LightningElement, api } from "lwc";

export default class DynamicFormSectionCmp extends LightningElement {
  sectionData;
  @api sectionIndex;
  openEditBox = false;
  hasChildSection;
  sectionTypeObj = {
    isAccordion: false,
    isVertical: false,
    isHorizontal: false
  };
  isRendered;
  @api set eachSectionData(section) {
    this.sectionData = section;
    this.openEditBox = section.formSection.Id === undefined;
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

  saveSection() {}
  handleCancelSave() {}
  handleDropOfElement() {}
}
