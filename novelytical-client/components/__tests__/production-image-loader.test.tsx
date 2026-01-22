import { render, screen, waitFor } from '@testing-library/react';
import { ProductionImageLoader } from '../production-image-loader';

// Mock Next.js Image component
jest.mock('next/image', () => {
  return function MockImage({ src, alt, onError, onLoad, ...props }: any) {
    return (
      <img
        src={src}
        alt={alt}
        onError={onError}
        onLoad={onLoad}
        data-testid="mock-image"
        {...props}
      />
    );
  };
});

describe('ProductionImageLoader', () => {
  it('renders image with correct src and alt', () => {
    render(
      <ProductionImageLoader
        src="https://example.com/test.jpg"
        alt="Test Image"
        width={300}
        height={400}
      />
    );

    const image = screen.getByTestId('mock-image');
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg');
    expect(image).toHaveAttribute('alt', 'Test Image');
  });

  it('shows fallback placeholder on error', async () => {
    const onError = jest.fn();
    
    render(
      <ProductionImageLoader
        src="https://invalid-url.com/test.jpg"
        alt="Test Image"
        fallbackSrc="/images/book-placeholder.svg"
        onError={onError}
        width={300}
        height={400}
      />
    );

    const image = screen.getByTestId('mock-image');
    
    // Simulate first image error (original src)
    image.dispatchEvent(new Event('error'));

    // Wait for fallback to be tried
    await waitFor(() => {
      expect(image).toHaveAttribute('src', '/images/book-placeholder.svg');
    });

    // Simulate fallback image error too
    image.dispatchEvent(new Event('error'));

    // Now should show placeholder
    await waitFor(() => {
      expect(screen.getByText('📚')).toBeInTheDocument();
    });
  });

  it('calls onLoad callback when image loads successfully', async () => {
    const onLoad = jest.fn();
    
    render(
      <ProductionImageLoader
        src="https://example.com/test.jpg"
        alt="Test Image"
        onLoad={onLoad}
        width={300}
        height={400}
      />
    );

    const image = screen.getByTestId('mock-image');
    
    // Simulate image load
    image.dispatchEvent(new Event('load'));

    await waitFor(() => {
      expect(onLoad).toHaveBeenCalled();
    });
  });

  it('tries fallback image before showing placeholder', async () => {
    render(
      <ProductionImageLoader
        src="https://invalid-url.com/test.jpg"
        alt="Test Image"
        fallbackSrc="/images/book-placeholder.svg"
        width={300}
        height={400}
      />
    );

    const image = screen.getByTestId('mock-image');
    
    // Simulate first image error
    image.dispatchEvent(new Event('error'));

    await waitFor(() => {
      expect(image).toHaveAttribute('src', '/images/book-placeholder.svg');
    });
  });

  it('renders with fill prop correctly', () => {
    render(
      <ProductionImageLoader
        src="https://example.com/test.jpg"
        alt="Test Image"
        fill
      />
    );

    const image = screen.getByTestId('mock-image');
    expect(image).toHaveAttribute('src', 'https://example.com/test.jpg');
  });
});