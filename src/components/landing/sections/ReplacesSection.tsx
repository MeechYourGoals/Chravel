import React from 'react';
import FullPageLandingSection from '../FullPageLandingSection';
import { ReplacesGrid } from '../../conversion/ReplacesGrid';

const ReplacesSection: React.FC = () => {
  return (
    <FullPageLandingSection id="replaces">
      <div className="text-center w-full">
        <h2 className="text-4xl font-bold mb-8">Everything in One Place</h2>
        <p className="text-lg mb-8">Maps, schedules, expenses, and memories—all organized.</p>
        <div className="max-w-4xl mx-auto">
          <ReplacesGrid />
        </div>
      </div>
    </FullPageLandingSection>
  );
};

export default ReplacesSection;
