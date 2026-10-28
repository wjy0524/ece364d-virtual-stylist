
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function HomeScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.logo}>VIRTUAL STYLIST</Text>
        <Text style={styles.subtitle}>
          Your wardrobe. Your style.
        </Text>
      </View>

      <View style={styles.hero}>
        <Text style={styles.heroTitle}>
          Discover Your Personal Style
        </Text>

        <Text style={styles.description}>
          Organize your wardrobe, discover outfit
          combinations, and get personalized fashion
          recommendations.
        </Text>

        <Pressable
          style={styles.button}
          onPress={() => router.push('/onboarding')}
        >
          <Text style={styles.buttonText}>
            Get Started
          </Text>
        </Pressable>
      </View>

      <Text style={styles.sectionTitle}>
        What You Can Do
      </Text>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/closet')}
      >
        <Text style={styles.cardTitle}>
          My Digital Closet
        </Text>
        <Text style={styles.cardDescription}>
          Organize and explore your clothing collection.
        </Text>
        <Text style={styles.cardLink}>
          Open Closet →
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/recommendations')}
      >
        <Text style={styles.cardTitle}>
          AI Outfit Recommendations
        </Text>
        <Text style={styles.cardDescription}>
          Discover outfit combinations that match your style.
        </Text>
        <Text style={styles.cardLink}>
          View Recommendations →
        </Text>
      </Pressable>

      <Pressable
        style={styles.card}
        onPress={() => router.push('/shopping')}
      >
        <Text style={styles.cardTitle}>
          Shopping Recommendations
        </Text>
        <Text style={styles.cardDescription}>
          Discover clothing and accessories that complement
          your wardrobe.
        </Text>
        <Text style={styles.cardLink}>
          Explore Shopping →
        </Text>
      </Pressable>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>
          Virtual Try-On
        </Text>
        <Text style={styles.cardDescription}>
          Preview clothing through our upcoming AI integration.
        </Text>
        <Text style={styles.comingSoon}>
          Coming Soon
        </Text>
      </View>

      <Text style={styles.footer}>
        Virtual Stylist · Demo Version
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
  },
  header: {
    padding: 30,
    paddingTop: 55,
    backgroundColor: '#FFFFFF',
  },
  logo: {
    fontSize: 25,
    fontWeight: 'bold',
    color: '#A84E16',
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
  },
  hero: {
    margin: 20,
    padding: 25,
    backgroundColor: '#EFE3D5',
    borderRadius: 18,
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#222222',
    marginBottom: 15,
  },
  description: {
    fontSize: 15,
    color: '#555555',
    lineHeight: 24,
  },
  button: {
    marginTop: 25,
    backgroundColor: '#A84E16',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 10,
  },
  card: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginVertical: 8,
    padding: 22,
    borderRadius: 14,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#222222',
  },
  cardDescription: {
    fontSize: 14,
    color: '#666666',
    marginTop: 8,
    lineHeight: 21,
  },
  cardLink: {
    color: '#A84E16',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 15,
  },
  comingSoon: {
    color: '#999999',
    fontSize: 13,
    fontStyle: 'italic',
    marginTop: 12,
  },
  footer: {
    textAlign: 'center',
    color: '#999999',
    fontSize: 12,
    marginTop: 25,
    marginBottom: 50,
  },
});
