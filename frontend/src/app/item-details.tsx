import React from 'react';
import { View, Text, ScrollView, Pressable, StyleSheet } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { clothes } from '../data/clothes';
export default function ItemDetails() {
 const {id} = useLocalSearchParams<{id:string}>();
 const item=clothes.find(x=>x.id===id);
 if(!item)return <View style={s.page}><Text>Item not found.</Text><Pressable onPress={()=>router.back()}><Text>Go back</Text></Pressable></View>;
 return <ScrollView style={s.page} contentContainerStyle={{padding:22}}>
  <View style={s.photo}><Text style={{fontSize:110}}>{item.emoji}</Text></View>
  <Text style={s.title}>{item.name}</Text><Text style={s.muted}>{item.category} · {item.color}</Text>
  <Text style={s.label}>About this item</Text><Text style={s.muted}>{item.notes}</Text>
  <Pressable style={s.button} onPress={()=>router.push('/recommendations')}><Text style={s.buttonText}>Find outfits with this item</Text></Pressable>
  <Text style={s.muted}>Virtual try-on integration coming soon.</Text>
 </ScrollView>;
}
const s=StyleSheet.create({page:{flex:1,backgroundColor:'#F8F5F0'},photo:{height:290,backgroundColor:'#EFE3D5',borderRadius:20,justifyContent:'center',alignItems:'center'},title:{fontSize:30,fontWeight:'800',marginTop:22},label:{fontWeight:'700',fontSize:18,marginTop:26,marginBottom:8},muted:{color:'#706760',marginTop:8,fontSize:15},button:{backgroundColor:'#A84E16',padding:17,borderRadius:13,alignItems:'center',marginTop:30,marginBottom:12},buttonText:{color:'white',fontWeight:'700'}});
