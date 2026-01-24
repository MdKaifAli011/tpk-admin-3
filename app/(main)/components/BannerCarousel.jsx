"use client";
import React from "react";
import Image from "next/image";
import * as FaIcons from "react-icons/fa";

const VerticalBannerList = ({ banners = [] }) => {
  const getImageUrl = (url) => {
    if (!url) return "";
    if (url.startsWith("http")) return url;
    return url.startsWith("/self-study") ? url : `/self-study${url}`;
  };

  if (!banners || banners.length === 0) {
    return (
      <div className="w-full h-56 flex items-center justify-center border-2 border-dashed rounded-xl bg-gray-50">
        <div className="text-center text-gray-400">
          <FaIcons.FaImage size={32} className="mx-auto mb-3" />
          <p className="text-sm font-medium">No banners available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-10">
      {banners.map((banner, index) => {
        const imageUrl = getImageUrl(banner.url);

        return (
          <div
            key={banner.filename || index}
            className="relative w-full bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden transition-shadow hover:shadow-md"
          >
            {/* Image Wrapper */}
            <div className="w-full bg-gray-100">
              <Image
                src={imageUrl}
                alt={banner.altText || "Discussion Banner"}
                width={1600}
                height={400}
                sizes="100vw"
                priority={index === 0}
                className="w-full h-auto object-contain"
              />
            </div>

            {/* Subtle separator */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-gray-200 to-transparent" />
          </div>
        );
      })}
    </div>
  );
};

export default VerticalBannerList;
