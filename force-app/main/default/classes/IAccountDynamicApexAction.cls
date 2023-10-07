/**
 * This class will be used for handling multiple inline apex action in dynamic form
 * There we have to make sure that argument passed here shall not be unrealted to the parent object
 * E.g if There is account object on which dynamic form is there then we need to make sure that the 
 * argument in the method should be from account object record or the related parent or 1 level below child object
 */
public interface IAccountDynamicApexAction {
    void sendEmailForAccount(String accId);/**this methods will be later changes based on requirement */
    List<Contact> createContactsForAcc(String accId, List<Contact> conToInsert);/**this methods will be later changes based on requirement */
}