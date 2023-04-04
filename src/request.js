import jsyaml from 'js-yaml'; //convert yaml to json

export async function get2dRecent(){
    await fetch('http://localhost:6968/2d/mostRecent') 
    .then(response => response.text())
    .then(data => { 
        data2D = data;
        return;
    });
    return data2D; 
}

export async function get1d_0Recent(){
    await fetch('http://localhost:6968/1d_0/mostRecent')
    .then(response => response.text())
    .then(data => { 
        data1d_0 = data;
      return; 
    });
    return data1d_0; 
}

export async function get1d_1Recent(){
    await fetch('http://localhost:6968/1d_1/mostRecent')
    .then(response => response.text())
    .then(data => { 
        data1d_1 = data;
        return; 
    });
    return data1d_1; 
}

export async function getYamlRecent(){
    await fetch('http://localhost:6968/yaml/mostRecent')
    .then(response => response.text())
    .then(data => { 
        jsonData = jsyaml.load(data);
        console.log(jsonData);
        return;
    });
    return jsonData;
}
