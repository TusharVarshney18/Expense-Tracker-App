import React from 'react';

import { LegalScreen } from '@/components/LegalScreen';
import { TERMS_OF_SERVICE } from '@/content/legal';

export default function TermsScreen() {
  return (
    <LegalScreen
      title={TERMS_OF_SERVICE.title}
      updated={TERMS_OF_SERVICE.updated}
      sections={TERMS_OF_SERVICE.sections}
    />
  );
}
