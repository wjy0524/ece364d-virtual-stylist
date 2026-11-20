
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Link, usePathname } from 'expo-router';

const tabs = [
  { label: 'Home', href: '/' },
  { label: 'Closet', href: '/closet' },
  { label: 'Recommendations', href: '/recommendations' },
  { label: 'Shopping', href: '/shopping' },
] as const;

export default function AppTabsWeb() {
  const pathname = usePathname();

  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const active = pathname === tab.href;

        return (
          <Link key={tab.href} href={tab.href} asChild>
            <Pressable
              style={[
                styles.tab,
                active && styles.activeTab,
              ]}
            >
              <Text
                style={[
                  styles.label,
                  active && styles.activeLabel,
                ]}
              >
                {tab.label}
              </Text>
            </Pressable>
          </Link>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#E5DED5',
    padding: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: '#EFE3D5',
  },
  label: {
    fontSize: 12,
    color: '#777777',
  },
  activeLabel: {
    color: '#A84E16',
    fontWeight: 'bold',
  },
});
