import {readFile,writeFile,mkdir,cp} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const web=path.join(root,'web');
let html=await readFile(path.join(web,'index.html'),'utf8');
const css=await readFile(path.join(web,'styles.css'),'utf8');
html=html.replace('<link rel="stylesheet" href="styles.css">',`<style>${css}</style>`).replace(/<link rel="manifest"[^>]+>/,'').replace('<link rel="icon" href="icon.svg" type="image/svg+xml">','');
for(const file of ['core.js','data.js','map.js','app.js']){
 const js=await readFile(path.join(web,file),'utf8');
 html=html.replace(`<script src="${file}"></script>`,`<script>${js.replaceAll('</script','<\\/script')}</script>`);
}
await mkdir(path.join(root,'dist'),{recursive:true});
for(const [name,offline] of [['Online',false],['Offline',true]]){
 const result=html.replace('<head>','<head><script>window.ATLAS_STANDALONE=true;window.ATLAS_OFFLINE='+offline+';</script>');
 await writeFile(path.join(root,`dist/Dispatch_Atlas_${name}.html`),result);
 const dir=path.join(root,'dist',name.toLowerCase());await mkdir(dir,{recursive:true});await cp(web,dir,{recursive:true});
 if(offline){const folderHTML=await readFile(path.join(web,'index.html'),'utf8');await writeFile(path.join(dir,'index.html'),folderHTML.replace('<head>','<head><script>window.ATLAS_OFFLINE=true;</script>'));}
 console.log(`${name}: ${Buffer.byteLength(result)} bytes; standalone + folder generated`);
}
