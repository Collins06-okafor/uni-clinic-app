const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

class ApiHelper {
  // Reads the XSRF-TOKEN cookie Laravel sets after /sanctum/csrf-cookie.
  // The value is URL-encoded by Laravel so we decode it before using it.
  private getXsrfToken(): string {
    const match = document.cookie
      .split('; ')
      .find(row => row.startsWith('XSRF-TOKEN='));
    return match ? decodeURIComponent(match.split('=')[1]) : '';
  }

  private async ensureCSRF(): Promise<void> {
    try {
      const response = await fetch(`${API_BASE_URL}/sanctum/csrf-cookie`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to initialize CSRF protection');
      }

      // Small delay to ensure cookie is set
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('CSRF initialization error:', error);
      throw error;
    }
  }

  async uploadAvatar(endpoint: string, file: File, token: string): Promise<any> {
    await this.ensureCSRF();

    const formData = new FormData();
    formData.append('avatar', file);

    const response = await fetch(endpoint, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': this.getXsrfToken(),  // ← THE MISSING LINE
      },
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    
    // Make URL absolute
    let imageUrl = data.avatar_url || data.url || data.path || data.image_url;
    
    if (imageUrl && !imageUrl.startsWith('http://') && !imageUrl.startsWith('https://')) {
      const cleanPath = imageUrl.startsWith('/') ? imageUrl.substring(1) : imageUrl;
      imageUrl = `${API_BASE_URL}/${cleanPath}`;
    }

    return { ...data, avatar_url: imageUrl };
  }

  async deleteAvatar(endpoint: string, token: string): Promise<any> {
    await this.ensureCSRF();

    const response = await fetch(endpoint, {
      method: 'DELETE',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': this.getXsrfToken(),  // ← THE MISSING LINE
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Delete failed: ${response.status}`);
    }

    return response.json().catch(() => ({ success: true }));
  }

  async updateProfile(endpoint: string, data: any, token: string): Promise<any> {
    await this.ensureCSRF();

    const response = await fetch(endpoint, {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-XSRF-TOKEN': this.getXsrfToken(),  // ← THE MISSING LINE
      },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `Update failed: ${response.status}`);
    }

    return response.json();
  }
}

export const apiHelper = new ApiHelper();