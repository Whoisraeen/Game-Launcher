import React from 'react';
import HeroSection from '../HeroSection';
import GameGrid from '../GameGrid';

const Library: React.FC = () => {
    return (
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden gap-6">
            <HeroSection />
            <GameGrid />
        </div>
    );
};

export default Library;