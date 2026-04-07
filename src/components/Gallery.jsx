import React from 'react'
import { Icons } from './Icons'

export function Gallery({
  photos,
  uploading,
  loadingPhotos,
  handleUpload,
  handleLogout,
  handleDeleteClick,
  setLightboxIndex,
  fileInputRef,
  formatDate
}) {
  return (
    <section className="card galleryCard">
      <div className="toolbar">
        <label className="uploadButton" data-uploading={uploading}>
          {uploading ? (
            <>
              <span className="spinner"></span> <span>Uploading...</span>
            </>
          ) : (
            <>
              <Icons.Plus /> <span>Upload Photo</span>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleUpload}
            disabled={uploading}
          />
        </label>
        <button className="logoutBtn" onClick={handleLogout}>
          Sign Out
        </button>
      </div>

      <div className="photoCount">
        {loadingPhotos
          ? 'Fetching records...'
          : `${photos.length} vault item${photos.length !== 1 ? 's' : ''}`}
      </div>

      {loadingPhotos && photos.length === 0 ? (
        <div className="loadingGrid">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="skeletonCard">
              <div className="skeletonImage"></div>
            </div>
          ))}
        </div>
      ) : photos.length === 0 ? (
        <div className="emptyState">
          <div className="emptyIcon"><Icons.Image /></div>
          <p className="emptyTitle">Your vault is empty</p>
          <p className="emptyDesc">
            Begin your secure collection by uploading your first photo above.
          </p>
        </div>
      ) : (
        <div className="gallery">
          {photos.map((photo, index) => (
            <article key={photo.id} className="photoCard">
              <button
                className="preview"
                onClick={() => setLightboxIndex(index)}
              >
                <img
                  src={photo.signedUrl || photo.publicUrl}
                  alt="Vault item"
                  loading="lazy"
                />
                <div className="photoOverlay">
                  <span className="zoomHint"><Icons.Search /> Quick View</span>
                </div>
              </button>
              <div className="photoMeta">
                <span className="photoDate">
                  {formatDate(photo.created_at)}
                </span>
                <button
                  className="deleteBtn"
                  onClick={() => handleDeleteClick(photo)}
                  title="Delete from vault"
                >
                  <Icons.Trash />
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
