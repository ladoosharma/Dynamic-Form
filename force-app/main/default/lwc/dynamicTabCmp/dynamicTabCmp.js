import { LightningElement, api } from "lwc";
export default class DynamicTabCmp extends LightningElement {
  @api isEditActionAvaiable;
  @api set iteratorObject(value) {
    this.iteratingObj = value;
    if (this.tabObj) {
      this.createIterativeObj();
    }
  }
  get iteratorObject() {
    return this.iteratorObjectTemp;
  }
  iteratingObj;
  @api tabType;
  tabObj;
  iteratorObjectTemp;
  placeHolderCmpConstructor;
  @api tabNameField = "formSection.Name";
  @api tempIdField = "formSection.Id";
  @api allowDragDrop = false;
  @api placeHolderCmpName;
  @api propertiesToBeSentMap = "index:sectionIndex,element:eachSectionData";
  connectedCallback() {
    if (this.propertiesToBeSentMap) {
      this.tabObj = {
        isVertical: this.tabType === "Vertical Tab",
        isHorizontal: this.tabType === "Horizontal Tab",
        isAccordion: this.tabType === "Accordion"
      };
      if (this.placeHolderCmpName) {
        const place = `Dynamic_Forms/${this.placeHolderCmpName}`;
        import(place).then(({ default: placeCmp }) => {
          this.placeHolderCmpConstructor = placeCmp;
        });
        this.createIterativeObj();
      }
    }
  }
  createIterativeObj() {
    this.iteratorObjectTemp = JSON.parse(JSON.stringify(this.iteratingObj)).map(
      (element, index) => {
        const copyObj = JSON.parse(JSON.stringify(element));
        copyObj.spreadObj = this.propertiesToBeSentMap
          .split(",")
          .reduce((prev, curr) => {
            prev[curr.split(":")[1]] =
              curr.split(":")[0] === "index"
                ? index
                : curr.split(":")[0] === "element"
                ? JSON.stringify(copyObj)
                : copyObj[curr.split(":")[0]];
            return prev;
          }, {});
        copyObj.Name = this.tabNameField.split(".").reduce((prev, curr) => {
          return prev[curr];
        }, copyObj);
        copyObj.classNav = `${
          this.tabObj.isHorizontal
            ? "slds-tabs_default__item"
            : "slds-vertical-tabs__nav-item"
        } ${element.formSection.isActiveSection ? "slds-is-active" : ""}`;
        copyObj.classBody = `${
          this.tabObj.isHorizontal
            ? "slds-tabs_default__content"
            : "slds-vertical-tabs__content"
        } ${element.formSection.isActiveSection ? "slds-show" : "slds-hide"}`;
        copyObj.tempId = this.tempIdField.split(".").reduce((prev, curr) => {
          return prev[curr];
        }, copyObj);
        return copyObj;
      }
    );
  }
  handleDropOfElement(evt) {
    this.dispatchEvent(
      new CustomEvent("dropped", {
        detail: evt.detail
      })
    );
  }
  toggleTab(evt) {
    const tabId = evt.currentTarget.dataset.tab;
    if (tabId) {
      const allBody = this.template.querySelectorAll(
        "div[data-id='tabsetBody']"
      );
      const tabNav = this.template.querySelectorAll("li[data-id='tabnav']");
      allBody.forEach((eachBody) => {
        eachBody.classList.remove("slds-show");
        eachBody.classList.add("slds-hide");
        if (eachBody.dataset.tab === tabId) {
          eachBody.classList.add("slds-show");
          eachBody.classList.remove("slds-hide");
        }
      });
      tabNav.forEach((eachBody) => {
        eachBody.classList.remove("slds-is-active");
        if (eachBody.dataset.tab === tabId) {
          eachBody.classList.add("slds-is-active");
        }
      });
    }
  }
  invokeEditClick(evt) {
    evt.stopPropagation();
    const tabIdclicked = evt.target.value;
    if (tabIdclicked) {
      const tabCmp = this.template.querySelector(
        `[data-cmp='${tabIdclicked}']`
      );
      if (tabCmp.enableEdit) {
        tabCmp.enableEdit();
      }
    }
  }
  invokeDelete(evt) {
    evt.stopPropagation();
    const tabIdclicked = evt.target.value;
    if (tabIdclicked) {
      const tabCmp = this.template.querySelector(
        `[data-cmp='${tabIdclicked}']`
      );
      if (tabCmp.enableEdit) {
        tabCmp.delteTheTab();
      }
    }
  }
}
