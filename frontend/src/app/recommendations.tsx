import React, { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, Text, View } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { Button, COLORS, Heading, Page, s } from '../components/ui';
import { categoryEmoji } from '../data/sample';
import {
  getRecommendations, getSavedOutfits, Outfit, rateOutfit, RecommendationResult, saveOutfit, unsaveOutfit,
} from '../lib/api';
import { useAuth } from '../lib/auth-context';

const OCCASIONS = ['All', 'Everyday', 'Work', 'Formal', 'Weekend', 'Going out'];
const message = (e: unknown) => (e instanceof Error ? e.message : String(e));

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={{ backgroundColor: active ? COLORS.accent : 'white', paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14 }}>
      <Text style={{ color: active ? 'white' : COLORS.ink }}>{label}</Text>
    </Pressable>
  );
}

function OutfitCard({ outfit, saved, rating, busy, onSave, onRate }: {
  outfit: Outfit; saved: boolean; rating?: boolean | null; busy: boolean;
  onSave: () => void; onRate: (helpful: boolean) => void;
}) {
  return (
    <View style={s.card}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {outfit.items.map(item => (
          <View key={item.id} style={{ width: '31%' }}>
            <View style={{ height: 90, backgroundColor: COLORS.cream, borderRadius: 10, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' }}>
              {item.image_url
                ? <Image source={{ uri: item.image_url }} style={{ width: '100%', height: '100%' }} />
                : <Text style={{ fontSize: 34 }}>{categoryEmoji[item.category] || '👚'}</Text>}
            </View>
            <Text numberOfLines={1} style={{ marginTop: 5, fontWeight: '700', color: COLORS.ink, textTransform: 'capitalize' }}>
              {String(item.name || item.subcategory || item.category)}
            </Text>
          </View>
        ))}
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 }}>
        <Text style={{ color: COLORS.muted }}>{outfit.occasion}</Text>
        <Text style={{ color: COLORS.accent, fontWeight: '800' }}>Rank {Number(outfit.ranking_score).toFixed(1)} / 100</Text>
      </View>
      <Text style={{ color: COLORS.ink, marginTop: 8, lineHeight: 20 }}>{outfit.explanation}</Text>
      {outfit.score_breakdown ? (
        <Text style={{ color: COLORS.muted, marginTop: 6, fontSize: 12 }}>
          Occasion {outfit.score_breakdown.occasion}% · Style {outfit.score_breakdown.style}% · Color {outfit.score_breakdown.color}% · Variety {outfit.score_breakdown.diversity}%
        </Text>
      ) : null}
      <Button label={saved ? 'Saved ✓ (tap to remove)' : 'Save look'} secondary={saved} loading={busy} onPress={onSave} />
      <View style={{ flexDirection: 'row', gap: 10 }}>
        <View style={{ flex: 1 }}><Button label="👍 Helpful" secondary={rating !== true} disabled={busy} onPress={() => onRate(true)} /></View>
        <View style={{ flex: 1 }}><Button label="👎 Not helpful" secondary={rating !== false} disabled={busy} onPress={() => onRate(false)} /></View>
      </View>
    </View>
  );
}

export default function Recommendations() {
  const { session, loading: authLoading } = useAuth();
  const [occasion, setOccasion] = useState('All');
  const [data, setData] = useState<RecommendationResult | null>(null);
  const [saved, setSaved] = useState<Outfit[]>([]);
  const [ratings, setRatings] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');

  const load = useCallback(async () => {
    if (!session) return;
    setLoading(true);
    setError('');
    try {
      const [result, savedLooks] = await Promise.all([
        getRecommendations(occasion === 'All' ? undefined : occasion),
        getSavedOutfits(),
      ]);
      setData(result);
      setSaved(savedLooks);
      // Restore thumbs-up/down from earlier visits.
      setRatings(prev => ({
        ...prev,
        ...Object.fromEntries(result.recommendations.filter(o => o.feedback != null).map(o => [o.id, o.feedback as boolean])),
      }));
    } catch (e) {
      setError(message(e));
    } finally {
      setLoading(false);
    }
  }, [session?.access_token, occasion]);
  useFocusEffect(useCallback(() => { void load(); }, [load]));

  const isSaved = (o: Outfit) => saved.some(x => x.id === o.id);

  async function toggleSave(o: Outfit) {
    setBusyId(o.id);
    setError('');
    try {
      if (isSaved(o)) {
        await unsaveOutfit(o.id);
        setSaved(list => list.filter(x => x.id !== o.id));
      } else {
        await saveOutfit(o);
        setSaved(list => [o, ...list]);
      }
    } catch (e) {
      setError(message(e));
    } finally {
      setBusyId('');
    }
  }

  async function rate(o: Outfit, helpful: boolean) {
    setBusyId(o.id);
    setError('');
    try {
      await rateOutfit(o, helpful);
      setRatings(prev => ({ ...prev, [o.id]: helpful }));
    } catch (e) {
      setError(message(e));
    } finally {
      setBusyId('');
    }
  }

  if (authLoading) return <Page><ActivityIndicator /></Page>;
  if (!session) {
    return (
      <Page>
        <Heading title="Outfit Recommendations" sub="Sign in to get outfits built from your own closet." />
        <Button label="Create Account / Log In" onPress={() => router.push('/auth')} />
      </Page>
    );
  }

  const outfits = data?.recommendations ?? [];
  const card = (o: Outfit, key: string) => (
    <OutfitCard key={key} outfit={o} saved={isSaved(o)} rating={ratings[o.id]} busy={busyId === o.id}
      onSave={() => void toggleSave(o)} onRate={helpful => void rate(o, helpful)} />
  );

  return (
    <Page>
      <Heading title="Looks made for you" sub="Outfit ideas built from pieces you actually own." />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginBottom: 18 }}>
        {OCCASIONS.map(o => <Chip key={o} label={o} active={occasion === o} onPress={() => setOccasion(o)} />)}
      </View>

      {loading ? <ActivityIndicator color={COLORS.accent} /> : null}
      {error ? (
        <View style={s.card}>
          <Text style={{ color: '#A32929', fontWeight: '700' }}>Something went wrong</Text>
          <Text style={{ marginTop: 8, color: COLORS.muted }}>{error}</Text>
          <Button label="Retry" onPress={() => void load()} />
        </View>
      ) : null}

      {!loading && data?.metadata_missing.length ? (
        <View style={[s.card, { backgroundColor: COLORS.cream }]}>
          <Text style={{ fontWeight: '700', color: COLORS.ink, marginBottom: 6 }}>Some wardrobe details are missing</Text>
          {data.metadata_missing.map(note => <Text key={note} style={{ color: COLORS.muted, marginTop: 3 }}>• {note}</Text>)}
        </View>
      ) : null}

      {!loading && data?.message && outfits.length ? <Text style={{ color: COLORS.muted, marginBottom: 10 }}>{data.message}</Text> : null}
      {!loading ? outfits.map(o => card(o, o.id)) : null}

      {!loading && !error && data && outfits.length === 0 ? (
        <View style={s.card}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: COLORS.ink }}>No complete looks yet</Text>
          <Text style={{ color: COLORS.muted, marginTop: 8 }}>{data.message || 'Add clothing to your closet to get outfit recommendations.'}</Text>
          <Button label="+ Upload Clothing" onPress={() => router.push('/add-item')} />
        </View>
      ) : null}

      {!loading && saved.length ? (
        <>
          <Text style={{ fontSize: 20, fontWeight: '800', color: COLORS.ink, marginTop: 18, marginBottom: 12 }}>Saved looks</Text>
          {saved.map(o => card(o, `saved-${o.id}`))}
        </>
      ) : null}

      <Button label="My Closet" secondary onPress={() => router.push('/closet')} />
    </Page>
  );
}
