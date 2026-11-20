import React,{useCallback,useState} from 'react';
import {ActivityIndicator,Image,Text,View} from 'react-native';
import {router,useFocusEffect,useLocalSearchParams} from 'expo-router';
import {Button,COLORS,Heading,Page,s} from '../components/ui';
import {ClosetItem,getItem} from '../lib/api';
import {categoryEmoji} from '../data/sample';
import {useAuth} from '../lib/auth-context';
export default function ItemDetails(){const {id}=useLocalSearchParams<{id:string}>();const {session}=useAuth();const[item,setItem]=useState<ClosetItem|null>(null);const[error,setError]=useState('');const[loading,setLoading]=useState(true);
  useFocusEffect(useCallback(()=>{if(!id||!session){setLoading(false);return;}let alive=true;setLoading(true);getItem(id).then(i=>{if(alive)setItem(i)}).catch(e=>{if(alive)setError(String(e))}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[id,session?.access_token]));
  if(!session)return <Page><Heading title="Sign in to view items"/><Button label="Log In" onPress={()=>router.replace('/auth')}/></Page>;
  if(loading)return <Page><ActivityIndicator/></Page>;
  if(!item)return <Page><Heading title="Item not found" sub={error||'No saved item matches this link.'}/><Button label="Back to Closet" onPress={()=>router.replace('/closet')}/></Page>;
  const url=item.signed_image_url||item.image_signed_url||item.image_url;
  return <Page><Heading title={item.subcategory||'Clothing Item'} sub="Saved in your private closet"/><View style={[s.card,{alignItems:'center',minHeight:230,justifyContent:'center'}]}>{url?<Image source={{uri:url}} style={{width:'100%',height:250}} resizeMode="contain"/>:<Text style={{fontSize:90}}>{categoryEmoji[item.category]||'👚'}</Text>}</View>
    {([['Category',item.category],['Color',item.color],['Brand',item.brand],['Size',item.tag_size||item.size]] as const).map(([label,v])=><View key={label} style={{paddingVertical:14,borderBottomWidth:1,borderBottomColor:COLORS.border,flexDirection:'row',justifyContent:'space-between'}}><Text style={{fontWeight:'700'}}>{label}</Text><Text style={{color:COLORS.muted}}>{v||'Not specified'}</Text></View>)}
    <Button label="Find Outfits" onPress={()=>router.push('/recommendations')}/><Button label="Back to Closet" secondary onPress={()=>router.replace('/closet')}/>
  </Page>
}
