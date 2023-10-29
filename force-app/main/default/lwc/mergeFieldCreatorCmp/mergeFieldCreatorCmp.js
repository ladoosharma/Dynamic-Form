import { LightningElement, api, wire, track } from "lwc";
import { getObjectInfo } from "lightning/uiObjectInfoApi";
const NONE_PICK = { label: "--None--", value: "" };

export default class MergeFieldCreatorCmp extends LightningElement {
  @api objectRelatedTo;
  currentLevel = 1;
  tempObj;
  selectedArgs;
  picklistGenerated = false;
  @api argumetList;
  @api actualArgumentList;
  @track currentObjectInfo;
  @track currentFieldsIteration;
  @track tempCurrentFieldIteration;
  @track currentFieldPath;
  isChildRelationSelected = false;
  hideLookupPopup = true;
  childFieldForArgumentMap = new Map();
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
            relationShipField: fields[eachField].relationshipName,
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
                relatedToObject: eachChild.childObjectApiName,
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
          ].fieldPath += `.[${selectedField.apiName}]`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].label += `-->[${selectedField.apiName}]`;
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].currentlySelected = true;
          if (
            !this.childFieldForArgumentMap.has(selectedField.relatedToObject) &&
            selectedField.relatedToObject
          ) {
            this.childFieldForArgumentMap.set(
              selectedField.relatedToObject,
              []
            );
          }
        } else if (selectedField.isParentRelation) {
          this.currentFieldPath[
            this.currentFieldPath.length - 1
          ].fieldPath += `.${selectedField.relationShipField}`;
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
      if (
        isFieldSelected === "false" ||
        (isFieldSelected === "true" && selectedField.isChildRelation)
      ) {
        /** put inside a list and then move the ietration forward */
        this.currentFieldPath.push({
          currentObject: selectedField.relatedToObject,
          label: this.currentFieldPath[this.currentFieldPath.length - 1].label,
          fieldPath:
            this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath,
          currentlySelected: false,
          isChildRelationShip: selectedField.isChildRelation
        });
        this.isChildRelationSelected = selectedField.isChildRelation;
        if (this.tempObj !== selectedField.relatedToObject) {
          this.tempObj = selectedField.relatedToObject;
          this.currentObjectInfo = undefined;
        }
      } else {
        /** close the lookup and populate the path value and append with Argument */
        this.hideLookupPopup = true;
        this.appendToTheArgument(true);
      }
    }
  }
  appendToTheArgument(makeDefault) {
    const texAreaFld = this.template.querySelector("lightning-textarea");
    const argsSelecetd = this.template.querySelector("lightning-combobox");
    //const regexStringWithMatch = `( )(${argsSelecetd.value})( ,|\\{(.+?)\\}|,)`;
    const newPath =
      this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath;
    let newargumentPath = texAreaFld.value
      .split(",")
      .reduce((prevArg, eachArgs) => {
        prevArg += eachArgs.includes(argsSelecetd.value)
          ? `${eachArgs.split("{")[0]}{!${newPath}} , `
          : `${eachArgs} , `;
        return prevArg;
      }, "");
    texAreaFld.value = makeDefault
      ? newargumentPath.substring(0, newargumentPath.length - 2)
      : this.argumetList;

    /** send the custom event and  */
    this.dispatchEvent(
      new CustomEvent("argumentchange", { detail: texAreaFld.value })
    );
  }
  openDropDown(evt) {
    const lookupInputContainer = this.template.querySelector(
      ".lookupInputContainer"
    );
    const clsList = lookupInputContainer
      ? lookupInputContainer.classList
      : undefined;
    const whichEvent = evt.target.getAttribute("data-source");
    if (!clsList) {
      return;
    }
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
  appendChildSelectedField() {
    if (this.isChildRelationSelected) {
      const currentObject =
        this.currentFieldPath[this.currentFieldPath.length - 1].currentObject;
      this.currentFieldPath[this.currentFieldPath.length - 1].label =
        this.childFieldForArgumentMap.has(currentObject)
          ? this.currentFieldPath[this.currentFieldPath.length - 1].label +
            "-->" +
            this.childFieldForArgumentMap.get(currentObject).join(":")
          : this.currentFieldPath[this.currentFieldPath.length - 1].label;
      this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath =
        this.childFieldForArgumentMap.has(currentObject)
          ? this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath +
            "." +
            this.childFieldForArgumentMap.get(currentObject).join(":")
          : this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath;
      this.currentFieldPath[
        this.currentFieldPath.length - 1
      ].currentlySelected = true;
      this.hideLookupPopup = false;
      this.currentObjectInfo = false;
      this.tempObj = undefined;
      this.childFieldForArgumentMap.delete(currentObject);
      this.appendToTheArgument(true);
    }
  }

  removeSelection(evt) {
    const indexValue = evt.target.dataset.index;
    if (indexValue !== undefined) {
      this.hideLookupPopup = false;
      const currentLength = this.currentFieldPath.length;
      const isLastElementRemoved =
        currentLength === parseInt(indexValue, 10) + 1;
      this.currentFieldPath = !isLastElementRemoved
        ? this.currentFieldPath.slice(0, parseInt(indexValue, 10) + 1)
        : this.currentFieldPath;
      this.currentFieldPath[
        this.currentFieldPath.length - 1
      ].currentlySelected = false;
      //this.currentObjectInfo = undefined;
      this.tempObj =
        this.currentFieldPath[this.currentFieldPath.length - 1].currentObject;
      this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath =
        this.currentFieldPath[this.currentFieldPath.length - 1].fieldPath
          .split(".")
          .slice(0, parseInt(indexValue, 10) + 1)
          .join(".");
      this.currentFieldPath[this.currentFieldPath.length - 1].label =
        this.currentFieldPath[this.currentFieldPath.length - 1].label
          .split("-->")
          .slice(0, parseInt(indexValue, 10) + 1)
          .join("-->");
      this.isChildRelationSelected =
        this.currentFieldPath[
          this.currentFieldPath.length - 1
        ].isChildRelationShip;
    }
  }
  get argsList() {
    /** here split the args and make it as picklist */
    if (this.argumetList) {
      //&& !this.picklistGenerated
      const argumentNames = this.actualArgumentList.match(/\b\w+\s*(?=[,]|$)/g);
      //this.picklistGenerated = true;
      return [
        NONE_PICK,
        ...argumentNames.map((e) => {
          return { label: e, value: e };
        })
      ];
    }
    return [NONE_PICK];
  }
  handleChildFieldSelection(evt) {
    const checked = evt.target.checked;
    const apiName = evt.target.value;
    const currentObjectSelected =
      this.currentFieldPath[this.currentFieldPath.length - 1].currentObject;
    evt.stopPropagation();
    if (currentObjectSelected) {
      if (this.childFieldForArgumentMap.has(currentObjectSelected)) {
        if (!checked) {
          this.childFieldForArgumentMap
            .get(currentObjectSelected)
            .push(apiName);
        } else {
          this.childFieldForArgumentMap.set(
            currentObjectSelected,
            this.childFieldForArgumentMap
              .get(currentObjectSelected)
              .filter((each) => {
                return each !== apiName;
              })
          );
        }
      }
    }
  }
  handleLookupSelection(evt) {
    const relationShip = evt.target.value;
    if (relationShip) {
      /** handle relationship selection */
    }
  }
  enableLookup(evt) {
    this.hideLookupPopup = true;
    this.currentFieldPath = [
      {
        currentObject: this.objectRelatedTo,
        label: "$Record",
        fieldPath: "$Record",
        currentlySelected: false
      }
    ];
    this.childFieldForArgumentMap = new Map();
    this.hideLookupPopup = evt.target.value === "";
    this.isChildRelationSelected = false;
    this.tempObj = this.objectRelatedTo;
    this.tempCurrentFieldIteration = undefined;
    //this.appendToTheArgument(false);
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
