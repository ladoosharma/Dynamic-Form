import { LightningElement, api, wire } from 'lwc';
import getRelatedApexClass from '@salesforce/apex/DynamicFormCreatorController.getRelatedApexClass';
import { createRecord } from 'lightning/uiRecordApi';
const ACTION_TYPE = [{ label: '--None--', value: '' }, { label: 'Apex Action', value: 'Apex' }, { label: 'Aura/LWC Action', value: 'Aura' }];
export default class CreateNewDynamicAction extends LightningElement {
    @api objectRelatedTo;
    actionType = ACTION_TYPE;
    apexClassNameList;
    apexMethod;
    methodMap;
    auraCmpName;
    argumentList;
    apexClassName;
    @api submitForm() {
        return createRecord({
            "apiName": "Apex_Aura_Action__c",
            "fields": {
                Apex_Class_Name__c: this.apexClassName,
                Apex_Method__c: this.apexMethod,
                Argument_List__c: this.argumentList,
                Aura_LWC_Cmp_Name__c: this.auraCmpName,
                Object_Related_To__c: this.objectRelatedTo,
                Name: ((this.apexClassName) ? (this.apexClassName + '.' + this.apexMethod) : this.auraCmpName)
            }
        });
    }
    get methodList() {
        return (this.methodMap) ? [...this.methodMap.keys()].map((eachMethod) => {
            return { label: eachMethod, value: eachMethod };
        }) : [{ value: '', label: '--None--' }];
    }
    get apexClassesList() {
        return (this.apexClassNameList) ? this.apexClassNameList.map(eachClass => {
            return { value: eachClass.Id, label: eachClass.Name };
        }) : [{ value: '', label: '--None--' }];
    }

    @wire(getRelatedApexClass, { objectName: '$objectRelatedTo' })
    relatedApexClass({ data, error }) {
        if (data) {
            this.apexClassNameList = JSON.parse(JSON.stringify(data));
        }
        if (error) {
            //handle error here
            console.error(error);
        }
    }
    handleApexClassSelection(evt) {
        const value = evt.target.value;
        if (value) {
            const apexClass = this.apexClassNameList.find((eachClass) => {
                return eachClass.Id === value;
            });
            this.apexClassName = apexClass.Name;
            const apexMethodDiv = this.template.querySelector('[data-id="ApexMethod"]');
            apexMethodDiv.classList.add('slds-show');
            apexMethodDiv.classList.remove('slds-hide');
            this.methodMap = this.getMethodsNameAndAgrument(apexClass.Body);
        }
    }
    handleApexMethodSelection(evt) {
        const methodValue = evt.target.value;
        const argListElement = this.template.querySelector('lightning-textarea[data-id="input"]');
        if (methodValue) {
            this.apexMethod = methodValue;
            this.argumentList = this.methodMap.get(methodValue);
            argListElement.disabled = true;
        }
    }
    handleTypeChange(evt) {
        const value = evt.target.value;
        const apexDiv = this.template.querySelector('[data-id="ApexClass"]');
        const apexMethodDiv = this.template.querySelector('[data-id="ApexMethod"]');
        const auraDiv = this.template.querySelector('[data-id="Aura"]');
        if (value === 'Apex') {
            apexDiv.classList.add('slds-show');
            apexDiv.classList.remove('slds-hide');
            apexMethodDiv.classList.add('slds-show');
            apexMethodDiv.classList.remove('slds-hide');
            auraDiv.classList.add('slds-hide');
            auraDiv.classList.remove('slds-show');
            this.auraCmpName = '';
            this.argumentList = '';
        } else if (value === 'Aura') {
            this.apexClassName = '';
            this.apexMethod = '';
            this.argumentList = '';
            apexDiv.classList.add('slds-hide');
            apexDiv.classList.remove('slds-show');
            apexMethodDiv.classList.add('slds-hide');
            apexMethodDiv.classList.remove('slds-show');
            auraDiv.classList.add('slds-show');
            auraDiv.classList.remove('slds-hide');
        }
    }
    getMethodsNameAndAgrument(classBody) {
        const interfaceRegex = /interface\s+(\w+)\s*\{([\s\S]*?)\}/i;
        const classMatch = classBody.match(interfaceRegex);

        if (classMatch) {
            const classBody = classMatch[2];
            const methodRegex = /\s*((\w+(?:<[\w\s,]*>)?)\s+(\w+))\s*\(([^)]*)\)/g;
            let methodMatch;
            const mapOfMethodToArgs = new Map();
            while ((methodMatch = methodRegex.exec(classBody)) !== null) {
                const fullReturnType = methodMatch[1];
                const returnType = methodMatch[2];
                const methodName = methodMatch[3];
                const parameters = methodMatch[4];
                console.log(parameters)
                // Extract complex return types and replace them with simplified placeholders
                const returnTypeSimplified = returnType.replace(/List<[^>]*>/g, 'List')
                    .replace(/Set<[^>]*>/g, 'Set')
                    .replace(/Map<[^>]*>/g, 'Map')
                    .replace(/<.*?>/g, ''); // Remove generics for simplicity

                const paramList = '(' + parameters + ')'
                const argumentRegex = /\b(Map|List|Set|Object|\w+)\s*(?:<([^>]+)>)?\s+(\w+)(?=\s*(?:,|\)))/g;
                const argumentsList = [];
                let match;
                while ((match = argumentRegex.exec(paramList)) !== null) {
                    const collectionType = match[1] || 'Object';
                    const dataType = match[2] || '';
                    const argumentName = match[3];
                    argumentsList.push({ name: argumentName, collectionType, dataType });
                }
                mapOfMethodToArgs.set(methodName, argumentsList.reduce((argsJoined, eachArgs) => {
                    argsJoined += ((eachArgs.dataType) ? `${eachArgs.collectionType}<${eachArgs.dataType}>` : eachArgs.collectionType) + ' ' + eachArgs.name + ' , ';
                    return argsJoined;
                }, ''));
            }
            return mapOfMethodToArgs;
        }
    }
}