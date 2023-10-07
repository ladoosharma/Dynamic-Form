public without sharing class DynamicFormCreatorController {
    private static Map<Id, Form_Section__c> mapOfSection;
    private static Map<Id, List<Id>> immediateChildMap;
    private static Set<Id> parentsSection;
    private static Map<String, List<sObject>> fieldActionMap;
    private static Map<String, List<sObject>> fieldDependenciesMap;
    private static Map<String, List<sObject>> fieldToSectionMap;
    @AuraEnabled(cacheable = true)
    public static FormTemplate getCurrentTemplate(Id templateId){
        try {
            if(!String.isBlank(templateId)){
                FormTemplate template = new FormTemplate();
                template.formTemplate = [Select Id,Form_Object__c, Form_type__c from Form_Template__c WHERE Id =: templateId WITH SECURITY_ENFORCED LIMIT 1];
                template.relatedFormActions = [Select Id,Event_Name_To_Trigger__c, Invoke_For_Field_Value__c, Apex_Aura_Action__r.Apex_Class_Name__c, Apex_Aura_Action__r.Apex_Method__c, 
                Apex_Aura_Action__r.Argument_List__c, Apex_Aura_Action__r.Aura_LWC_Cmp_Name__c, Form_Template__c from Form_Action__c  Where Form_Template__c =:templateId WITH SECURITY_ENFORCED LIMIT 49999 ];
                List<FormSection> formSections = new List<FormSection>();
                FormSection tempFormSection;
                parentsSection = new Set<Id>();
                immediateChildMap = new  Map<Id, List<Id>>();

                mapOfSection = new Map<Id, Form_Section__c>([Select Id,Name, Section_Number__c, Section_Type__c,Parent_Form_Section__c 
                ,(SELECT Id,Event_Name_To_Trigger__c, Invoke_For_Field_Value__c, Apex_Aura_Action__r.Apex_Class_Name__c,
                Apex_Aura_Action__r.Apex_Method__c, Apex_Aura_Action__r.Argument_List__c, Apex_Aura_Action__r.Aura_LWC_Cmp_Name__c, Form_Template__c
                FROM Section_Actions__r) FROM Form_Section__c WHERE Form_Template__c =: templateId WITH SECURITY_ENFORCED]);

                List<Form_Field__c> sectionFields = [Select Id,Field_API_Name__c,Field_Section__c, Field_Validation_Regex__c, Formula__c, Required__c, Type__c  
                FROM Form_Field__c WHERE Field_Section__c IN : mapOfSection.keyset() WITH SECURITY_ENFORCED];

                List<Form_Action__c> fieldActions = [Select Id,Event_Name_To_Trigger__c,Field_Action__c, Invoke_For_Field_Value__c, Apex_Aura_Action__r.Apex_Class_Name__c,
                Apex_Aura_Action__r.Apex_Method__c, Apex_Aura_Action__r.Argument_List__c, Apex_Aura_Action__r.Aura_LWC_Cmp_Name__c, Form_Template__c
                from Form_Action__c WHERE Field_Action__c IN (SELECT ID FROM Form_Field__c WHERE Field_Section__c IN: mapOfSection.keyset()) WITH SECURITY_ENFORCED];

                List<Form_Dependency__c> fieldDependencies = [Select Id,Controlling_Field__c, Dependency_Type__c, Dependent_Field__c, Dependent_Section__c, On_Controlling_Value__c
                from Form_Dependency__c WHERE Controlling_Field__c IN (SELECT ID FROM Form_Field__c WHERE Field_Section__c IN: mapOfSection.keyset()) WITH SECURITY_ENFORCED];
                fieldToSectionMap = genericMapCreatorBasedOnKey('Field_Section__c', sectionFields);
                fieldDependenciesMap = genericMapCreatorBasedOnKey('Controlling_Field__c', fieldDependencies);
                fieldActionMap = genericMapCreatorBasedOnKey('Field_Action__c', fieldActions);
                for(Form_Section__c section: mapOfSection.values()){
                    if(section.Parent_Form_Section__c == null && !immediateChildMap.containsKey(section.Id)){
                        parentsSection.add(section.Id);
                        immediateChildMap.put(section.Id, new List<Id>());
                        continue;
                    }else if(section.Parent_Form_Section__c == null && immediateChildMap.containsKey(section.Id)){
                        parentsSection.add(section.Id);
                        continue;
                    }
                    if(!immediateChildMap.containsKey(section.Parent_Form_Section__c)){
                        immediateChildMap.put(section.Parent_Form_Section__c, new List<Id>{section.Id});
                    }else{
                        immediateChildMap.get(section.Parent_Form_Section__c).add(section.Id);
                    }
                }
                FormSection tempSection;
                if(!parentsSection.isEmpty()){
                    /**section are there and run a for loop over to create a node */
                    for(Id parentSecId : parentsSection){
                        tempSection = new FormSection();
                        tempSection.formSection = mapOfSection.get(parentSecId);
                        tempSection.relatedSectionActions = mapOfSection.get(parentSecId).Section_Actions__r;
                        tempSection.sectionFields = getAllFieldForSection(parentSecId);
                        tempSection.childFormSection = recursiveSectionCreator(parentSecId);
                        formSections.add(tempSection);
                    }
                }
                template.formSections = formSections;
                System.debug(JSON.serializePretty(template));
                return template;
            }
            return null;
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    private static Map<String, List<sObject>> genericMapCreatorBasedOnKey(String key, List<sObject> iteratorList){
        Map<String, List<sObject>> genericMapWithStringKey = new Map<String, List<sObject>>();
        for(sObject eachObj: iteratorList){
            if(!eachObj.isSet(key)){
                continue;
            }
            if(genericMapWithStringKey.containsKey(String.valueOf(eachObj.get(key)))){
                genericMapWithStringKey.get(String.valueOf(eachObj.get(key))).add(eachObj);
            }else{
                genericMapWithStringKey.put(String.valueOf(eachObj.get(key)), new List<sObject>{eachObj});
            }
        }
        return genericMapWithStringKey;
    }
    private static List<FormField> getAllFieldForSection(Id sectionId){
        List<FormField> fields = new List<FormField>();
        FormField tempField;
        if(fieldToSectionMap.containsKey(sectionId)){
            for(sObject field: fieldToSectionMap.get(sectionId)){
                tempField = new FormField();
                tempField.formField = (Form_Field__c)field;
                tempField.relatedFieldActions = (List<Form_Action__c>)(!(fieldActionMap.containsKey((String)field.get('Id')))?new List<Form_Action__c>():fieldActionMap.get((String)field.get('Id')));
                tempField.controllingFieldDependency = (List<Form_Dependency__c>)(!(fieldDependenciesMap.containsKey((String)field.get('Id')))?new List<Form_Dependency__c>():fieldDependenciesMap.get((String)field.get('Id')));
                fields.add(tempField);
            }
        }
        return fields;
    }
    private static List<FormSection> recursiveSectionCreator(Id parentSectionId){
        FormSection tempSection;
        List<FormSection> formSections = new List<FormSection>();
        for(Id childSection: immediateChildMap.get(parentSectionId)){
            tempSection = new FormSection();
            tempSection.formSection = mapOfSection.get(childSection);
            tempSection.relatedSectionActions = mapOfSection.get(childSection).Section_Actions__r;
            tempSection.sectionFields = getAllFieldForSection(childSection);
            tempSection.childFormSection = (immediateChildMap.containsKey(childSection))?recursiveSectionCreator(childSection):null;
            formSections.add(tempSection);
        }
        return formSections;
    }
    @AuraEnabled(cacheable = true)
    public static Form_Action__c getActionRecord(Id actionId){
        try {
            return [Select Id,Apex_Aura_Action__r.Apex_Method__c, Apex_Aura_Action__r.Apex_Class_Name__c, Apex_Aura_Action__r.Argument_List__c,
             Apex_Aura_Action__r.Aura_LWC_Cmp_Name__c, Event_Name_To_Trigger__c, Field_Action__c, Form_Template__c, Invoke_For_Field_Value__c from Form_Action__c WHERE Id=: actionId WITH SECURITY_ENFORCED];
        } catch (Exception e) {
            throw new AuraHandledException(e.getMessage());
        }
    }
    @AuraEnabled(cacheable=true)
    public static list<sObject> fetchLookupData(string searchKey , string sObjectApiName) {   
        if(!checkIfObjectisAccessible(sObjectApiName)){
            throw new AuraHandledException('Object '+ sObjectApiName + ' is not accessible to this user.');
        } 
        List < sObject > returnList = new List < sObject > ();
        string sWildCardText = '%' + searchKey + '%';
        string sQuery = 'Select Id,Name From ' + sObjectApiName + ' Where Name Like : sWildCardText order by createdDate DESC LIMIT 5';
        for (sObject obj: database.query(String.escapeSingleQuotes(sQuery))) {
            returnList.add(obj);
        }
        return returnList;
    }
    private static Boolean checkIfObjectisAccessible(String objectName){
        Schema.DescribeSobjectResult[] results = Schema.describeSObjects(new List<String>{objectName});
        return results[0].isQueryable();

    }
    // Method to fetch lookup default value 
    @AuraEnabled
    public static sObject fetchDefaultRecord(string recordId , string sObjectApiName) {
        if(!checkIfObjectisAccessible(sObjectApiName)){
            throw new AuraHandledException('Object '+ sObjectApiName + ' is not accessible to this user.');
        } 
        string sRecId = recordId;    
        string sQuery = 'Select Id,Name From ' + sObjectApiName + ' Where Id = : sRecId LIMIT 1';
        for (sObject obj: database.query(String.escapeSingleQuotes(sQuery))) {
            return obj;
        }
        return null;
    }
    public class FormTemplate{
        @auraEnabled public Form_Template__c formTemplate;
        @auraEnabled public List<Form_Action__c> relatedFormActions;
        @auraEnabled public List<FormSection> formSections;

    }
    public class FormSection{
        @auraEnabled public Form_Section__c formSection;
        @auraEnabled public List<FormSection> childFormSection;
        @auraEnabled public List<Form_Action__c> relatedSectionActions;
        @auraEnabled public List<FormField> sectionFields;
    }
    public class FormField{
        @auraEnabled public Form_Field__c formField;  
        @auraEnabled public List<Form_Action__c> relatedFieldActions;  
        @auraEnabled public List<Form_Dependency__c> controllingFieldDependency;  
    }
}