
import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useRouter } from 'expo-router';

const clothingItems = [
  { id: '1', name: 'White T-Shirt', category: 'Tops', emoji: '👕', color: 'White' },
  { id: '2', name: 'Blue Jeans', category: 'Bottoms', emoji: '👖', color: 'Blue' },
  { id: '3', name: 'Black Jacket', category: 'Outerwear', emoji: '🧥', color: 'Black' },
  { id: '4', name: 'White Sneakers', category: 'Shoes', emoji: '👟', color: 'White' },
  { id: '5', name: 'Summer Dress', category: 'Dresses', emoji: '👗', color: 'Pink' },
  { id: '6', name: 'Brown Boots', category: 'Shoes', emoji: '🥾', color: 'Brown' },
];

const categories = [
  'All',
  'Tops',
  'Bottoms',
  'Outerwear',
  'Shoes',
  'Dresses',
];

export default function ClosetScreen() {
  const router = useRouter();
  const [selectedCategory, setSelectedCategory] = useState('All');

  const filteredItems = clothingItems.filter(
    (item) =>
      selectedCategory === 'All' ||
      item.category === selectedCategory
  );

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.heading}>My Digital Closet</Text>
      <Text style={styles.subtitle}>
        Your wardrobe, all in one place.
      </Text>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filters}
      >
        {categories.map((category) => (
          <Pressable
            key={category}
            onPress={() => setSelectedCategory(category)}
            style={[
              styles.filterButton,
              selectedCategory === category && styles.activeFilter,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedCategory === category &&
                  styles.activeFilterText,
              ]}
            >
              {category}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      <View style={styles.grid}>
        {filteredItems.map((item) => (
          <Pressable
            key={item.id}
            style={styles.card}
            onPress={() =>
              router.push({
                pathname: '/item-details',
                params: {
                  id: item.id,
                  name: item.name,
                  category: item.category,
                  color: item.color,
                  emoji: item.emoji,
                },
              })
            }
          >
            <View style={styles.imagePlaceholder}>
              <Text style={styles.emoji}>{item.emoji}</Text>
            </View>

            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemCategory}>
              {item.category} · {item.color}
            </Text>
          </Pressable>
        ))}
      </View>

      <Pressable style={styles.addButton}>
        <Text style={styles.addButtonText}>
          + Add Clothing Item (Coming Soon)
        </Text>
      </Pressable>

      <Text style={styles.note}>
        Demo wardrobe. Clothing uploads will be connected later.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F5F0',
    paddingHorizontal: 20,
  },
  heading: {
    fontSize: 30,
    fontWeight: 'bold',
    color: '#222222',
    marginTop: 30,
  },
  subtitle: {
    fontSize: 15,
    color: '#777777',
    marginTop: 8,
    marginBottom: 25,
  },
  filters: {
    marginBottom: 20,
    flexGrow: 0,
  },
  filterButton: {
    paddingHorizontal: 18,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#E5DED5',
  },
  activeFilter: {
    backgroundColor: '#A84E16',
    borderColor: '#A84E16',
  },
  filterText: {
    color: '#333333',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  card: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    marginBottom: 15,
  },
  imagePlaceholder: {
    backgroundColor: '#EFE3D5',
    height: 140,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emoji: {
    fontSize: 60,
  },
  itemName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222222',
    marginTop: 12,
  },
  itemCategory: {
    fontSize: 13,
    color: '#777777',
    marginTop: 5,
  },
  addButton: {
    backgroundColor: '#222222',
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 15,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  note: {
    color: '#888888',
    textAlign: 'center',
    fontSize: 12,
    marginTop: 15,
    marginBottom: 45,
  },
});
