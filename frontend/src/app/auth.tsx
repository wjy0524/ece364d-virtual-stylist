import React, { useState } from 'react';
import { Alert, Text, View } from 'react-native';
import { router } from 'expo-router';
import { Button, COLORS, Field, Heading, Page } from '../components/ui';
import { supabase, supabaseHost } from '../lib/supabase';
import { useAuth } from '../lib/auth-context';
export default function Auth() {
  const {session} = useAuth();
  const [mode,setMode] = useState<'signup'|'login'>('signup');
  const [email,setEmail] = useState('');
  const [password,setPassword] = useState('');
  const [busy,setBusy] = useState(false);
  async function submit(){
    if(!email.includes('@')||password.length<6){Alert.alert('Check details','Enter an email and password of at least 6 characters.');return;}
    setBusy(true);
    try {
      if(mode==='signup'){
        const {data,error}=await supabase.auth.signUp({email:email.trim(),password});
        if(error)throw error;
        if(data.session){Alert.alert('Account created','You are signed in.');router.replace('/onboarding');}
        else Alert.alert('Check your email','Supabase may require email confirmation. Confirm your email, then sign in.');
      } else {
        const {error}=await supabase.auth.signInWithPassword({email:email.trim(),password});
        if(error)throw error;
        router.replace('/closet');
      }
    }catch(e){Alert.alert('Authentication error',`${e instanceof Error?e.message:String(e)}\n\nSupabase URL: ${supabaseHost}\nCheck that the project URL resolves in Safari.`)}
    finally{setBusy(false);}
  }
  return <Page><Heading title="Your Style Account" sub="Private closet storage powered by Supabase Auth."/>
    {session?<><Text style={{fontSize:18,color:COLORS.ink,marginBottom:16}}>Signed in as {session.user.email}</Text><Button label="Open Closet" onPress={()=>router.replace('/closet')}/><Button label="Log Out" secondary onPress={async()=>{const {error}=await supabase.auth.signOut();if(error)Alert.alert('Error',error.message)}}/></>:<>
      <View style={{flexDirection:'row',gap:10,marginBottom:20}}><View style={{flex:1}}><Button label="Sign Up" secondary={mode!=='signup'} onPress={()=>setMode('signup')}/></View><View style={{flex:1}}><Button label="Log In" secondary={mode!=='login'} onPress={()=>setMode('login')}/></View></View>
      <Field label="Email" value={email} onChangeText={setEmail} placeholder="you@example.com" keyboardType="email-address"/>
      <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 6 characters" secureTextEntry/>
      <Button label={mode==='signup'?'Create Account':'Log In'} onPress={submit} loading={busy}/>
      <Text style={{color:COLORS.muted,marginTop:24,lineHeight:20}}>If email confirmation is enabled, you must verify your email. If a hostname cannot be found, check your Supabase URL in .env.local and restart Expo.</Text>
    </>}
  </Page>;
}
