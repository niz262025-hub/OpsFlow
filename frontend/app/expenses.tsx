import React from 'react';
import { Redirect } from 'expo-router';

export default function ExpensesRedirect() {
  return <Redirect href={{ pathname: '/(tabs)/finance' } as any} />;
}
