import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, RefreshControl, Text, View } from 'react-native';
import { useFocusEffect, router } from 'expo-router';
import { Button, COLORS, Heading, Page, s } from '../components/ui';
import { apiBase, ClosetItem, getItems } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { categoryEmoji, samples } from '../data/sample';
const filters=['all','top','bottom','layer','dress','shoes','accessory'];
export default function Closet(){
  const {session,loading:authLoading}=useAuth(); const [items,setItems]=useState<ClosetItem[]>([]);
  const [error,setError]=useState(''); const [loading,setLoading]=useState(false); const [filter,setFilter]=useState('all'); const [showDemo,setShowDemo]=useState(false);
  const load=useCallback(async()=>{if(!session)return;setLoading(true);setError('');try{setItems(await getItems());}catch(e){setError(e instanceof Error?e.message:String(e));}finally{setLoading(false)}},[session?.access_token]);
  useFocusEffect(useCallback(()=>{void load()},[load]));
  if(authLoading)return <Page><ActivityIndicator/></Page>;
  if(!session)return <Page><Heading title="My Digital Closet" sub="Sign in to view your private wardrobe."/><Button label="Create Account / Log In" onPress={()=>router.push('/auth')}/><Button label="Preview Sample Closet" secondary onPress={()=>setShowDemo(!showDemo)}/>{showDemo?samples.map(x=><Text key={x.id} style={{padding:12}}>{x.emoji} {x.name}</Text>):null}</Page>;
  const visible=items.filter(i=>filter==='all'||i.category===filter);
  return <Page><Heading title="My Digital Closet" sub={`${items.length} saved clothing items · Private to your account`}/>
    <Button label="+ Upload Clothing" onPress={()=>router.push('/add-item')}/><Button label="Outfit Recommendations" secondary onPress={()=>router.push('/recommendations')}/>
    <View style={{flexDirection:'row',flexWrap:'wrap',gap:7,marginTop:20,marginBottom:18}}>{filters.map(f=><Pressable key={f} onPress={()=>setFilter(f)} style={{backgroundColor:filter===f?COLORS.accent:'white',paddingHorizontal:11,paddingVertical:9,borderRadius:14}}><Text style={{color:filter===f?'white':COLORS.ink,textTransform:'capitalize'}}>{f}</Text></Pressable>)}</View>
    {loading?<ActivityIndicator color={COLORS.accent}/>:null}
    {error?<View style={s.card}><Text style={{color:'#A32929',fontWeight:'700'}}>Could not load saved closet</Text><Text style={{marginTop:8,color:COLORS.muted}}>{error}</Text><Text style={{marginTop:8}}>Backend: {apiBase}</Text><Button label="Retry" onPress={()=>void load()}/></View>:null}
    {!loading&&!error&&visible.length===0?<View style={s.card}><Text style={{fontSize:17,fontWeight:'700'}}>No clothing items yet</Text><Text style={{color:COLORS.muted,marginTop:8}}>Tap Upload Clothing to add your first photo, or preview demo items below.</Text></View>:null}
    <View style={{flexDirection:'row',flexWrap:'wrap',justifyContent:'space-between'}}>{visible.map(item=>{
      const url=item.signed_image_url||item.image_signed_url||item.image_url;
      return <Pressable key={item.id} onPress={()=>router.push({pathname:'/item-details',params:{id:item.id}})} style={[s.card,{width:'48%',padding:9}]}><View style={{height:135,backgroundColor:COLORS.cream,borderRadius:12,justifyContent:'center',alignItems:'center',overflow:'hidden'}}>{url?<Image source={{uri:url}} style={{width:'100%',height:'100%'}}/>:<Text style={{fontSize:50}}>{categoryEmoji[item.category]||'👚'}</Text>}</View><Text style={{fontWeight:'800',marginTop:10,textTransform:'capitalize'}}>{item.subcategory||item.category}</Text><Text style={{color:COLORS.muted,marginTop:4}}>{item.color||item.brand||'Clothing item'}</Text></Pressable>})}</View>
    <Button label={showDemo?'Hide Sample Items':'Preview Six Sample Items'} secondary onPress={()=>setShowDemo(!showDemo)}/>
    {showDemo?samples.filter(x=>filter==='all'||x.category===filter).map(x=><View key={x.id} style={[s.card,{flexDirection:'row',alignItems:'center',gap:12}]}><Text style={{fontSize:35}}>{x.emoji}</Text><View><Text style={{fontWeight:'700'}}>{x.name}</Text><Text style={{color:COLORS.muted}}>Demo only · {x.category}</Text></View></View>):null}
  </Page>;
}
