import React from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, COLORS, Heading, Page, s } from '../components/ui';
import { useAuth } from '../lib/auth-context';
import { supabase } from '../lib/supabase';
export default function Home() {
  const {session,loading} = useAuth();
  const features = [
    {title:'My Digital Closet',sub:'View your real uploaded clothes',to:'/closet'},
    {title:'Outfit Recommendations',sub:'Sample outfits while the AI model is being built',to:'/recommendations'},
    {title:'Shopping',sub:'Product suggestions and retailer links',to:'/shopping'},
  ] as const;
  return <Page><View style={{paddingTop:35,marginBottom:14}}><Text style={{fontSize:15,fontWeight:'800',letterSpacing:3,color:COLORS.accent}}>VIRTUAL STYLIST</Text></View>
    <Heading title="Your wardrobe. Your style." sub="Build your closet, save your preferences, and discover outfits."/>
    <View style={{backgroundColor:COLORS.cream,padding:20,borderRadius:20,marginBottom:26}}>
      <Text style={{fontSize:22,fontWeight:'800',color:COLORS.ink,marginBottom:10}}>{session?'Welcome back!':'Start your personal style journey'}</Text>
      <Text style={{color:COLORS.muted,lineHeight:22}}>{session?`Signed in as ${session.user.email||'user'}`:'Create an account to save clothing photos in your own private closet.'}</Text>
      {loading?<Text>Checking session...</Text>:session?<>
        <Button label="Open My Closet" onPress={()=>router.push('/closet')}/>
        <Button label="Style Preferences" secondary onPress={()=>router.push('/onboarding')}/>
        <Button label="Log Out" secondary onPress={async()=>{const {error}=await supabase.auth.signOut();if(error)Alert.alert('Logout failed',error.message)}}/>
      </>:<Button label="Create Account / Log In" onPress={()=>router.push('/auth')}/>}
    </View>
    <Text style={{fontSize:20,fontWeight:'800',marginBottom:12,color:COLORS.ink}}>Explore</Text>
    {features.map(f=><Pressable key={f.to} style={s.card} onPress={()=>router.push(f.to)}><Text style={{fontSize:18,fontWeight:'700',color:COLORS.ink}}>{f.title}  →</Text><Text style={{color:COLORS.muted,marginTop:6}}>{f.sub}</Text></Pressable>)}
    <Text style={{color:COLORS.muted,textAlign:'center',marginTop:12}}>Virtual Try-On: coming soon</Text>
  </Page>;
}
