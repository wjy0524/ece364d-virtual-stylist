import React, {useState} from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, COLORS, Heading, Page } from '../components/ui';
import { useAuth } from '../lib/auth-context';
import { savePreferences } from '../lib/api';
import AsyncStorage from '@react-native-async-storage/async-storage';
const styles=['Casual','Streetwear','Formal','Minimalist','Athletic'];
const sizes=['XS','S','M','L','XL','XXL'];
export default function Onboarding(){
  const {session}=useAuth(); const [style,setStyle]=useState(''); const [size,setSize]=useState('');const [busy,setBusy]=useState(false);
  async function finish(){
    if(!style||!size){Alert.alert('Choose preferences','Select a style and clothing size.');return;}
    setBusy(true);
    try{
      await AsyncStorage.setItem('vs_style',style);
      await AsyncStorage.setItem('vs_size',size);
      if(session) await savePreferences({aesthetics:[style.toLowerCase()],preferred_fits:[],occasions:[],disliked_items:[]});
      router.replace(session?'/closet':'/auth');
    }catch(e){Alert.alert('Could not save to backend',`${e instanceof Error?e.message:String(e)}\nYour selections were saved locally. You can retry after the backend is ready.`)}
    finally{setBusy(false)}
  }
  function choices(values:string[],chosen:string,set:(v:string)=>void){return <View style={{flexDirection:'row',flexWrap:'wrap',gap:10,marginBottom:25}}>{values.map(v=><Pressable key={v} onPress={()=>set(v)} style={{paddingHorizontal:17,paddingVertical:13,backgroundColor:chosen===v?COLORS.accent:'white',borderRadius:12,borderWidth:1,borderColor:COLORS.border}}><Text style={{color:chosen===v?'white':COLORS.ink,fontWeight:'600'}}>{v}</Text></Pressable>)}</View>}
  return <Page><Heading title="Let's Find Your Style" sub="Your answers will help us personalize your closet and future outfit recommendations."/><Text style={{fontSize:18,fontWeight:'800',marginBottom:12}}>Preferred style</Text>{choices(styles,style,setStyle)}<Text style={{fontSize:18,fontWeight:'800',marginBottom:12}}>Clothing size</Text>{choices(sizes,size,setSize)}<Button label="Save and Continue" onPress={finish} loading={busy} disabled={!style||!size}/></Page>
}
