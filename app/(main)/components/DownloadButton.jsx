"use client";
import PropTypes from "prop-types";
import React, { useState } from "react";
import { FaDownload } from "react-icons/fa";
import DownloadModal from "./DownloadModal";
import Button from "./Button";

const DownloadButton = ({ unitName }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsModalOpen(true)}
        variant="primary"
        size="md"
        className="inline-flex items-center gap-2"
      >
        <FaDownload className="text-sm" />
        <span>Download</span>
      </Button>
      <DownloadModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        unitName={unitName}
      />
    </>
  );
};

DownloadButton.propTypes = {
  unitName: PropTypes.string.isRequired,
};

export default DownloadButton;

