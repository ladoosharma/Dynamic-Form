import { LightningElement, api } from "lwc";

export default class DynamicFormSectionCmp extends LightningElement {
  sectionData;
  openEditBox = false;
  @api set eachSectionData(section) {
    this.sectionData = section;
    this.openEditBox = section.Id === undefined;
  }
  get eachSectionData() {
    return this.sectionData;
  }
  saveSection() {}
  handleCancelSave() {}
}
