public class C3C_MDT_ControlService implements C3C_MDT_IControlService {

    public class C3C_MDT_ControlServiceException extends Exception {}

    public String metadatas(String key) 
    { 
        return JSON.serialize
        (
            this.instanceC3C_MDT_IControlSelector.setGeneric(key).getAllMDTs() 
        ); 
    } 
    
    public String columns(String key) 
    { 
        return JSON.serialize
        (
            ((C3C_MDT_ControlDomain) C3C_DIContainer_Injector.newInstance('C3C_MDT_ControlDomain')).setDeveloperName(key).setMdtFieldMap().getFieldNameByDataType()
        ); 
    }

    public void save(String key, String listjson)
    {
        Metadata.DeployContainer container = new Metadata.DeployContainer();

        C3C_MDT_ControlDomain domain = ((C3C_MDT_ControlDomain) C3C_DIContainer_Injector.newInstance('C3C_MDT_ControlDomain')).setDeveloperName(key);

        for(String mdtJson : (List<String>) JSON.deserialize(listjson, List<String>.class)) { container.addMetadata(domain.buildCustomMetadataByInstance(mdtJson)); }
        
        System.debug('Custom Metadata Container | ' + container);

        Id asyncResult = Metadata.Operations.enqueueDeployment(container, null);
    }

    private C3C_MDT_IControlSelector instanceC3C_MDT_IControlSelector {
        get
        {
            if(instanceC3C_MDT_IControlSelector == null)
                instanceC3C_MDT_IControlSelector = (C3C_MDT_IControlSelector) C3C_DIContainer_Injector.getInstance('C3C_MDT_ControlSelector');

            return instanceC3C_MDT_IControlSelector;
        }
        set;
    }
}