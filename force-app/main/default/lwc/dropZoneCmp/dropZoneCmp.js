import { LightningElement, api, wire } from "lwc";
import { registerListener } from "c/pubsub";
import { CurrentPageReference } from "lightning/navigation";
import {
  subscribe,
  unsubscribe,
  APPLICATION_SCOPE,
  MessageContext,
  publish
} from "lightning/messageService";
import DYNAMIC_CHANNEL from "@salesforce/messageChannel/dynamicFormChannel__c";
export default class DropZoneCmp extends LightningElement {
  dropText;
  @api placedInsideType;
  @api disableActionDrop = false;
  validPlacementMap = new Map();
  whatIsDragged;
  isActiveDropZone = false;
  @api relevantIdOfPlaceholder;
  @wire(MessageContext)
  messageContext;
  subscription;
  disconnectedCallback() {
    this.unsubscribeToMessageChannel();
  }
  @wire(CurrentPageReference) pageRef;
  connectedCallback() {
    this.validPlacementMap.set("field", ["Section"]);
    this.validPlacementMap.set("section", ["Section", "Template"]);
    this.validPlacementMap.set("action", ["Section", "Template", "Field"]);
    this.validPlacementMap.set("formula", ["Section"]);
    this.validPlacementMap.set("dependencies", ["Section", "Field"]);
    this.validPlacementMap.set("table", ["Section"]);
    if (!this.pageRef) {
      this.pageRef = { attributes: { url: window.location.href } };
    }
    this.subscribeToMessageChannel();
  }
  subscribeToMessageChannel() {
    if (!this.subscription) {
      this.subscription = subscribe(
        this.messageContext,
        DYNAMIC_CHANNEL,
        (message) => this.handleActivation(message),
        { scope: APPLICATION_SCOPE }
      );
    }
  }

  unsubscribeToMessageChannel() {
    unsubscribe(this.subscription);
    this.subscription = null;
  }
  // renderedCallback() {
  //   registerListener("draggedElement", this.handleActivation, this);
  // }
  @api forceRegisterEvent() {
    registerListener("draggedElement", this.handleActivation, this);
  }
  handleDragOverAction(evt) {
    if (this.isActiveDropZone) {
      evt.preventDefault();
    }
  }
  handleActivation(data) {
    const backGroundElement = this.template.querySelector(
      "div[data-id='dropZone']"
    );
    const allDivs = this.template.querySelectorAll(".centeredDiv");
    this.whatIsDragged = data.whatIsDragged;
    this.isActiveDropZone = this.validPlacementMap.has(this.whatIsDragged)
      ? this.validPlacementMap
          .get(this.whatIsDragged)
          .includes(this.placedInsideType)
      : false;
    if (this.whatIsDragged === "action" && this.disableActionDrop) {
      this.isActiveDropZone = false;
    }
    this.dropText = this.isActiveDropZone
      ? `Please drop ${this.whatIsDragged} here to add to the ${this.placedInsideType}`
      : "";
    if (this.isActiveDropZone && this.whatIsDragged) {
      backGroundElement.classList.add("slds-show");
      backGroundElement.classList.add("slds-box");
      backGroundElement.classList.remove("slds-hide");
      backGroundElement.classList.add("backgroundAllowed");
      backGroundElement.classList.remove("backgroundNotAllowed");
      allDivs.forEach((each) => {
        each.classList.add("slds-show");
        each.classList.remove("slds-hide");
      });
    } else if (this.whatIsDragged) {
      backGroundElement.classList.add("slds-show");
      backGroundElement.classList.add("slds-box");
      backGroundElement.classList.remove("slds-hide");
      backGroundElement.classList.remove("backgroundAllowed");
      backGroundElement.classList.add("backgroundNotAllowed");
      allDivs.forEach((each) => {
        each.classList.add("slds-show");
        each.classList.remove("slds-hide");
      });
    } else {
      backGroundElement.classList.add("slds-hide");
      backGroundElement.classList.remove("slds-show");
      backGroundElement.classList.remove("slds-box");
      backGroundElement.classList.remove("backgroundAllowed");
      backGroundElement.classList.remove("backgroundNotAllowed");
      allDivs.forEach((each) => {
        each.classList.add("slds-hide");
        each.classList.remove("slds-show");
      });
    }
  }
  handleDrop() {
    this.dispatchEvent(
      new CustomEvent("dropped", {
        detail: {
          recordId: this.relevantIdOfPlaceholder,
          whatIsDropped: this.whatIsDragged,
          placedInsideType: this.placedInsideType
        }
      })
    );
    publish(this.messageContext, DYNAMIC_CHANNEL, { whatIsDragged: "" });
  }
}
