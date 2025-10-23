'use client'

import Image from 'next/image';
import React, { useEffect, useState } from 'react'
import { cn, getTechLogos } from '@/lib/utils'

type TechIcon = { tech: string; url: string };

const DisplayTechIcons = ({ techStack }: TechIconProps) => {
    const [techIcons, setTechIcons] = useState<TechIcon[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const loadTechIcons = async () => {
            try {
                const icons = await getTechLogos(techStack);
                setTechIcons(icons);
            } catch (error) {
                console.error('Error loading tech icons:', error);
                // Fallback to default tech icons
                setTechIcons(techStack.map(tech => ({ tech, url: '/tech.svg' })));
            } finally {
                setLoading(false);
            }
        };

        loadTechIcons();
    }, [techStack]);

    if (loading) {
        return (
            <div className='flex flex-row'>
                {techStack.slice(0, 3).map((tech, index) => (
                    <div key={tech} className={cn('relative group bg-dark-300 rounded-full p-2 flex-center animate-pulse', index >= 1 && '-ml-3')}>
                        <div className='size-5 bg-gray-600 rounded'></div>
                    </div>
                ))}
            </div>
        );
    }

    return (
        <div className='flex flex-row'>
            {techIcons.slice(0, 3).map(({ tech, url }, index) => (
                <div key={tech} className={cn('relative group bg-dark-300 rounded-full p-2 flex-center', index >= 1 && '-ml-3')}>
                    <span className='tech-tooltip'>
                        {tech}
                    </span>
                    <Image src={url} alt={`Tech icon ${index + 1}`} width={100} height={100} className='size-5' />
                </div>
            ))}
        </div>
    )
}

export default DisplayTechIcons