import { LightningElement, api, wire, track } from "lwc";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
const NONE_PICK = { label: "--None--", value: "" };

export default class MergeFieldCreatorCmp extends LightningElement {
  @api objectRelatedTo;
  currentLevel = 1;
  tempObj;
  @api argumetList;
  @track currentObjectInfo;
  @track currentFieldsIteration;
  @track tempCurrentFieldIteration;
  @track currentFieldPath;
  isChildRelationSelected = false;
  hideLookupPopup = true;
  connectedCallback() {
    this.tempObj = this.objectRelatedTo;
    this.currentFieldPath = [
      {
        currentObject: this.objectRelatedTo,
        label: "$Record",
        fieldPath: "$Record",
        currentlySelected: false
      }
    ];
  }
  @wire(getObjectInfo, { objectApiName: "$tempObj" })
  objectInfoResult({ data, error }) {
    if (data) {
      this.currentObjectInfo = data;
      this.handleFieldCreationList();
    }
    if (error) {
      /**handle error here */
    }
  }
  handleFieldCreationList() {
    if (this.currentObjectInfo) {
      const fields = this.currentObjectInfo.fields;
      this.currentFieldsIteration = [
        ...Object.keys(fields).map((eachField) => {
          return {
            apiName: eachField,
            label: fields[eachField].label,
            isParentRelation: fields[eachField].dataType === "Reference",
            relatedToObject: fields[eachField].referenceToInfos.length
              ? fields[eachField].referenceToInfos[0].apiName
              : "",
            relationShipType:
              fields[eachField].dataType === "Reference" ? "Parent" : "Field",
            iconName:
              fields[eachField].dataType === "Reference"
                ? "utility:add_source"
                : "utility:formula"
          };
        }),
        ...(!this.isChildRelationSelected
          ? this.currentObjectInfo.childRelationships.map((eachChild) => {
              return {
                label: eachChild.relationshipName,
                apiName: eachChild.relationshipName,
                relatedToObject: eachChild.eachChild,
                relationShipType: "Child",
                isChildRelation: true,
                iconName: "utility:hierarchy"
              };
            })
          : [])
      ];
      this.tempCurrentFieldIteration = this.currentFieldsIteration;
    }
  }
  handleSelection(evt) {
    const selectedApiName = evt.target.dataset.field
      ? evt.target.dataset.field
      : evt.currentTarget.dataset.field;
    const isFieldSelected = evt.target.dataset.selected
      ? evt.target.dataset.selected
      : evt.currentTarget.dataset.selected;
    evt.stopPropagation();
    if (selectedApiName) {
      const selectedField = this.currentFieldsIteration.find((field) => {
        return field.apiName === selectedApiName;
      });
      if (selectedField) {
        if (selectedField.isChildRelation) {
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].fieldPath += `[${selectedField.apiName}]`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].label += `-->[${selectedField.apiName}]`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].currentlySelected = true;
        } else if (selectedField.isParentRelation) {
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].fieldPath += `.${selectedField.apiName}`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].label += `-->${selectedField.label}`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].currentlySelected = true;
        } else {
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].fieldPath += `.${selectedField.apiName}`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].label += `-->${selectedField.apiName}`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].currentlySelected = true;
          /** hide the lookup field if the field is selected */
        }
      }
      if (isFieldSelected === "false") {
        /** put inside a list and then move the ietration forward */
        this.currentFieldPath.push({
          currentObject: selectedField.relatedToObject,
          label: this.currentFieldPath[this.currentFieldPath.length - 1].label,
          fieldPath:
            this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath,
          currentlySelected: false
        });
        this.isChildRelationSelected = selectedField.isChildRelation;
        if (this.tempObj !== selectedField.relatedToObject) {
          this.tempObj = selectedField.relatedToObject;
          this.currentObjectInfo = undefined;
        }
      } else {
        /** close the lookup and populate the path value and append with Argument */
        this.hideLookupPopup = true;
      }
    }
  }
  openDropDown(evt) {
    const lookupInputContainer = this.template.querySelector(
      ".lookupInputContainer"
    );
    const clsList = lookupInputContainer.classList;
    const whichEvent = evt.target.getAttribute("data-source");
    switch (whichEvent) {
      case "searchInputField":
        clsList.add("slds-is-open");
        break;
      case "lookupContainer":
        clsList.remove("slds-is-open");
        break;
      default:
        break;
    }
  }
  removeSelection(evt) {
    const indexValue = evt.target.dataset.index;
    if (indexValue !== undefined) {
      this.hideLookupPopup = false;
      this.currentFieldPath = this.currentFieldPath.slice(
        0,
        parseInt(indexValue, 10) - 1
      );
      this.currentFieldPath[
        this.currentFieldPath.length - 1
      ].currentlySelected = false;
    }
  }
  get argsList() {
    /** here split the args and make it as picklist */
    if (this.argumetList) {
      const argumentRegex = /(?:,\s*)?(\w+)(?=\s*(?:,|\)))/g;
      const argumentNames = this.argumetList.match(argumentRegex);
      return [
        NONE_PICK,
        ...argumentNames.map((e) => {
          return { label: e, value: e };
        })
      ];
    }
    return [NONE_PICK];
  }

  handleLookupSelection(evt) {
    const relationShip = evt.target.value;
    if (relationShip) {
      /** handle relationship selection */
    }
  }
  enableLookup(evt) {
    this.hideLookupPopup = evt.target.value === "";
  }
  searchLookup(evt) {
    const value = evt.target.value;
    if (value.length > 3) {
      this.tempCurrentFieldIteration = this.currentFieldsIteration.filter(
        (eachField) => {
          return (
            eachField.apiName.includes(value) || eachField.label.includes(value)
          );
        }
      );
    }
  }
}
