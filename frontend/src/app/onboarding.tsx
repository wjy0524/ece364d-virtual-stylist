import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
} from 'react-native';
import { useRouter } from 'expo-router';

export default function OnboardingScreen() {
  const router = useRouter();

  const [selectedStyle, setSelectedStyle] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const stylesList = [
    'Casual',
    'Streetwear',
    'Formal',
    'Minimalist',
    'Athletic',
  ];

  const sizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>
        Let's Find Your Style
      </Text>

      <Text style={styles.subtitle}>
        Tell us about your fashion preferences.
      </Text>

      <Text style={styles.sectionTitle}>
        What's your preferred style?
      </Text>

      <View style={styles.options}>
        {stylesList.map((style) => (
          <Pressable
            key={style}
            style={[
              styles.option,
              selectedStyle === style && styles.selected,
            ]}
            onPress={() => setSelectedStyle(style)}
          >
            <Text
              style={[
                styles.optionText,
                selectedStyle === style && styles.selectedText,
              ]}
            >
              {style}
            </Text>
          </Pressable>
        ))}
      </View>

      <Text style={styles.sectionTitle}>
        What's your clothing size?
      </Text>

      <View style={styles.options}>
        {sizes.map((size) => (
          <Pressable
            key={size}
            style={[
              styles.option,
              selectedSize === size && styles.selected,
            ]}
            onPress={() => setSelectedSize(size)}
          >
            <Text
              style={[
                styles.optionText,
                selectedSize === size && styles.selectedText,
              ]}
            >
              {size}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable
        style={[
          styles.button,
          (!selectedStyle || !selectedSize) && styles.disabled,
        ]}
        disabled={!selectedStyle || !selectedSize}
        onPress={() => router.replace('/')}
      >
        <Text style={styles.buttonText}>
          Continue
        </Text>
      </Pressable>

      <Text style={styles.note}>
        Demo mode: Your preferences are not saved yet.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
    padding: 24,
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#222222',
    marginTop: 45,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    marginTop: 10,
    marginBottom: 30,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 12,
  },
  options: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 28,
  },
  option: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginRight: 10,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#E5DED5',
  },
  selected: {
    backgroundColor: '#A84E16',
    borderColor: '#A84E16',
  },
  optionText: {
    fontSize: 15,
    color: '#333333',
  },
  selectedText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  button: {
    backgroundColor: '#A84E16',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  disabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
  },
  note: {
    textAlign: 'center',
    color: '#888888',
    fontSize: 12,
    marginBottom: 50,
  },
});