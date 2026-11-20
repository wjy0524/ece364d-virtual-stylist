import React, {useState} from 'react';
import { Alert, Image, Pressable, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { Button, COLORS, Field, Heading, Page } from '../components/ui';
import { Category, classifyImage, createItem, uploadItemImage } from '../lib/api';
import { useAuth } from '../lib/auth-context';
const categories:Category[]=['top','bottom','dress','layer','shoes','accessory'];
export default function AddItem(){
  const {session}=useAuth(); const [category,setCategory]=useState<Category>('top'); const [subcategory,setSubcategory]=useState(''); const [color,setColor]=useState('');const [brand,setBrand]=useState('');const [size,setSize]=useState('');
  const [photo,setPhoto]=useState<ImagePicker.ImagePickerAsset|null>(null);const [busy,setBusy]=useState(false);const [savedId,setSavedId]=useState<string|null>(null);
  const [detecting,setDetecting]=useState(false);const [detectNote,setDetectNote]=useState('');
  // Ask the backend classifier for a category/type; the user can still change both before saving.
  async function choose(asset:ImagePicker.ImagePickerAsset){
    setPhoto(asset);setDetectNote('');if(savedId)return;setDetecting(true);
    try{const {top_prediction:p}=await classifyImage({uri:asset.uri,name:asset.fileName,mimeType:asset.mimeType});
      if(categories.includes(p.category))setCategory(p.category);if(p.subcategory)setSubcategory(p.subcategory);
      setDetectNote(`Detected: ${p.subcategory||p.category}. Change it below if it's wrong.`);}
    catch(e){setDetectNote(`Auto-detect unavailable (${e instanceof Error?e.message:String(e)}). Pick the category manually.`)}
    finally{setDetecting(false)}
  }
  async function pick(){const result=await ImagePicker.launchImageLibraryAsync({mediaTypes:['images'],quality:0.75,allowsEditing:false});if(!result.canceled&&result.assets[0])void choose(result.assets[0]);}
  async function camera(){const permission=await ImagePicker.requestCameraPermissionsAsync();if(!permission.granted){Alert.alert('Camera permission','Allow camera access to take a photo.');return;}const result=await ImagePicker.launchCameraAsync({quality:0.75});if(!result.canceled&&result.assets[0])void choose(result.assets[0]);}
  async function save(){if(!photo){Alert.alert('Select a photo','Pick or take a clothing photo first.');return;}
    if(photo.fileSize&&photo.fileSize>10*1024*1024){Alert.alert('Image too large','Choose an image smaller than 10 MB.');return;}
    setBusy(true);let id=savedId;
    try {
      if(!id){const record=await createItem({category,subcategory:subcategory||undefined,color:color||undefined,brand:brand||undefined,tag_size:size||undefined});id=record.id;
        if(!id)throw new Error('POST /api/items succeeded but did not return an item id. Check backend response schema.');
        setSavedId(id);
      }
      await uploadItemImage(id,{uri:photo.uri,name:photo.fileName||'clothing.jpg',mimeType:photo.mimeType||'image/jpeg'});
      Alert.alert('Uploaded','Your clothing photo was saved.');router.replace('/closet');
    } catch(e){Alert.alert('Upload failed',`${e instanceof Error?e.message:String(e)}\n\n${id?'The item record may already exist. Retry will upload to the same item.':'No item was confirmed created.'}`)}
    finally{setBusy(false)}
  }
  if(!session)return <Page><Heading title="Log in first"/><Button label="Go to Login" onPress={()=>router.replace('/auth')}/></Page>;
  return <Page><Heading title="Add Clothing" sub="Create a closet item, then upload its photo to private storage through FastAPI."/>
    <View style={{flexDirection:'row',gap:10}}><View style={{flex:1}}><Button label="Choose Photo" onPress={()=>void pick()}/></View><View style={{flex:1}}><Button label="Take Photo" secondary onPress={()=>void camera()}/></View></View>
    {photo?<Image source={{uri:photo.uri}} style={{height:220,width:'100%',borderRadius:14,marginVertical:18}} resizeMode="contain"/>:<View style={{height:160,backgroundColor:COLORS.cream,borderRadius:14,alignItems:'center',justifyContent:'center',marginVertical:18}}><Text style={{color:COLORS.muted}}>No photo selected</Text></View>}
    {detecting?<Text style={{color:COLORS.muted,marginBottom:12}}>Detecting clothing type…</Text>:detectNote?<Text style={{color:COLORS.muted,marginBottom:12}}>{detectNote}</Text>:null}
    <Text style={{fontSize:18,fontWeight:'800',marginBottom:12}}>Category</Text><View style={{flexDirection:'row',flexWrap:'wrap',gap:8,marginBottom:20}}>{categories.map(c=><Pressable key={c} disabled={!!savedId} onPress={()=>setCategory(c)} style={{backgroundColor:c===category?COLORS.accent:'white',padding:12,borderRadius:12}}><Text style={{color:c===category?'white':COLORS.ink,textTransform:'capitalize'}}>{c}</Text></Pressable>)}</View>
    <Field label="Item type (optional)" value={subcategory} onChangeText={setSubcategory} placeholder="T-shirt, jeans, blazer..."/>
    <Field label="Color (optional)" value={color} onChangeText={setColor} placeholder="Black"/>
    <Field label="Brand (optional)" value={brand} onChangeText={setBrand} placeholder="Brand"/>
    <Field label="Tag Size (optional)" value={size} onChangeText={setSize} placeholder="M"/>
    {savedId?<Text style={{color:COLORS.muted}}>Item already created (ID {savedId}). Retrying uploads the image without duplicating the item.</Text>:null}
    <Button label="Save Clothing & Upload Photo" loading={busy} onPress={()=>void save()}/>
    <Text style={{color:COLORS.muted,marginTop:15}}>The backend accepts a multipart field called "file" and images up to 10 MB.</Text>
  </Page>;
}
