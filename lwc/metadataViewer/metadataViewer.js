import { LightningElement, api } from 'lwc';
import callServiceMethod from '@salesforce/apex/C3C_MDT_ControlAdapter.callServiceMethod';

export default class MetadataViewer extends LightningElement 
{   
    dev_name;           // Dev name do metadado utilizado   
    columns;            // Campos do metadado utilizado

    dataMap;            // Mapa de todos os registros

    data = [];          // Registros na tabela
    mdts_toSave = [];   // Registros que foram editados

    loading = true;
    search_param = '';
    
    // public function - seta o metadado para retrieve
    @api setDevName (value) { this.dev_name = value; }

    // public function - seta as colunas para os dados
    @api setColumns (value) { this.columns = value; }

    // public function - carrega os dados | deve ser chamada após os sets de colunas e devname
    @api retrieveMetadatas()
    {
        if(this.template.querySelector('div[class="noncontainer"]')) 
            this.template.querySelector('div[class="noncontainer"]').classList.remove('noncontainer');

        if(this.dev_name)
        {
            this.loading = true;
            this.dataMap = null;

            callServiceMethod({
                methodName : 'getMetadatas',
                methodParams : { mdtlabel : this.dev_name }
            })
            .then((resultJson) => this.handleCallToRetrieve(resultJson))
            .catch((error) => console.log(error.message));
        }
    }

    handleCallToRetrieve(response)
    {
        response = JSON.parse(response);
        this.dataMap = new Map();

        if(response.length > 0) { response.forEach((mdtRecord) => this.dataMap.set(mdtRecord.QualifiedApiName, this.constructNonEditedMetadata(mdtRecord))); }
            
        // Carrega todos os registros e desativa loading
        this.handleSearch();
    }

    handleCallToSave() 
    { 
        try
        {
            this.saveUpdates(); 

            this.loading = true;
            this.mdts_toSave = [];
            this.dataMap.forEach((value, key, map) => this.filterBy(value, key, map, this.mdts_toSave, 'save'));  

            this.callToSave();
        } catch (e) { console.log(e.message); }
    }

    handleAdd() 
    { 
        try 
        { 
            this.saveUpdates();
            let new_binding = this.constructNonEditedMetadata({MasterLabel:'', QualifiedApiName:`${this.dataMap.size+1}`});

            this.loading = true;
            this.data = [];
            this.dataMap.set(new_binding.QualifiedApiName, new_binding);
            this.dataMap.forEach((value, key, map) => this.filterBy(value, key, map, this.data, 'masterlabel'));
            
            this.loading = false;
        }catch(e) { console.log(e.message); }
    }

    handleSearch() 
    {
        try
        {
            this.saveUpdates();

            this.loading = true;
            this.data = [];
            this.dataMap.forEach((value, key, map) => this.filterBy(value, key, map, this.data, 'masterlabel'));
            this.loading = false;
        } catch (e) { console.log(e.message); }
    }

    keyPressSearch(event) { if(event.keyCode == 13) this.search_param = event.currentTarget.value; this.handleSearch(); }

    // Re-preenche um array com os valores no mapa de acordo com um filtro especificado -> utiliza a prop searchParam
    // | os editados ficam sempre em primeiro | os novos e sem label ficam em primeiro | save somente para editados | 
    filterBy(value, key, map, callbackArray, filter) 
    { 
        if(value['Edited'] && filter !== 'save') { callbackArray.unshift(map.get(key)); }
        else
        {
            switch (filter)
            {
                case 'masterlabel' :
                    if(value['MasterLabel'] == null) { callbackArray.unshift(map.get(key)); break; }
                    if(value['MasterLabel'].startsWith(this.search_param)) { callbackArray.push(map.get(key)); break; }

                case 'save' : 
                    if(value['Edited'] && value['MasterLabel'] !== null) { callbackArray.push(JSON.stringify(map.get(key))); break; }
            }  
        }
    }

    // Salva mudanças|edições no mapa (antes de cada operação que mude a estrutura da tabela)
    saveUpdates()
    {
        let datatable = this.template.querySelector('lightning-datatable');      
        try
        {
            for(let i in datatable.draftValues)
            {       
                
                let newMdt = datatable.draftValues[i];
                console.log('New mdt - ', newMdt) 
                let tempRecord = this.constructEditedMetadata(newMdt, this.dataMap.get(newMdt['QualifiedApiName'])); 

                console.log('Temp record - ', tempRecord)
                this.dataMap.set(tempRecord.QualifiedApiName, tempRecord);
            }
        } catch(e) { console.log(e.message); }
    }

    // Salva os metadados | apenas os editados
    callToSave()
    {
        if(this.mdts_toSave.length > 0)
        {
            this.loading = true;

            callServiceMethod({
                methodName : 'saveMetadatas',
                methodParams : { mdtlabel : this.dev_name, listjson : JSON.stringify(this.mdts_toSave) }
            })
            .then((result) => this.retrieveMetadatas())
            .catch((error) => console.log(error.message));
        } else { this.loading = false; }
    }

    // Construtores
    // Constrói um resgistro atualizado comparando com um antigo no mapa
    constructEditedMetadata(newMdt, old)
    {
        let temp = old;

        for(let i in this.columns)
        {
            let col = this.columns[i].fieldName;  // Campo do metadado, incluindo __c

            // Verifica se o novo registro possui o campo atualizado
            if(this.columns[i].type == 'boolean') { temp[col] = String(newMdt[col]) !== 'undefined' ? newMdt[col] : temp[col]; }
            else { temp[col] = newMdt[col] ? newMdt[col] : temp[col]; }            
        }
        temp['Edited'] = true;
        return temp;

        // Exemplo do que acontece acima
        // temp.MasterLabel = newMdt.MasterLabel ? newMdt.MasterLabel : temp.MasterLabel;
        // temp.Estatico__c = newMdt.Estatico__c !== undefined ?  newMdt.Estatico__c : temp.Estatico__c;   
    }

    // Para cada coluna|campo do metadado ele constrói um novo objeto
    constructNonEditedMetadata(draftMdt)
    {
        let temp = new Object();

        for(let i in this.columns)
        {
            let col = this.columns[i].fieldName;  // Campo do metadado, incluindo __c;
            temp[col] = draftMdt[col] ? draftMdt[col] : undefined;  // Verifica se o metadado de rascunho possui o campo
        }
        return temp;

        // Exemplo do que acontece acima
        // temp.Id = draftMdt.Id ? draftMdt.Id : undefined;
        // temp.ClasseApex__c = draftMdt.ClasseApex__c ? draftMdt.ClasseApex__c : undefined;
    }
}