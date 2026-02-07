'use client';

import Modal from './ui/Modal';

export default function ContactModal({ isOpen, onClose }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Contact Author" maxWidth="max-w-sm">
      <div className="flex flex-col items-center space-y-4">
        <img
          src="/qrcode.png"
          alt="WeChat QR Code"
          className="w-48 rounded-lg"
          onError={(e) => {
            e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='192' height='192' viewBox='0 0 192 192'%3E%3Crect width='192' height='192' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' dy='.3em' font-family='sans-serif' font-size='14' fill='%236b7280'%3EQR code not uploaded%3C/text%3E%3C/svg%3E";
          }}
        />
        <p className="text-gray-500 text-sm text-center">
          Scan the QR code to add the author on WeChat
        </p>
      </div>
    </Modal>
  );
}
