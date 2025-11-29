import React from 'react';
import GameGrid from '../GameGrid';
import HeroSection from '../HeroSection';

const Library: React.FC = () => {
    return (
        <div className="flex flex-col h-full overflow-hidden">
            <div className="px-6 pt-6 pb-2 shrink-0">
                <HeroSection />
            </div>
            <GameGrid />
        </div>
    );
};

export default Library;