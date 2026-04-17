/**
 * Test Script for Update Null Fields Feature
 * 
 * This script validates that the updateNullFieldsOnly implementation works correctly.
 * Run this after deploying the changes to verify functionality.
 * 
 * Usage:
 * 1. Build the project: npm run build
 * 2. Start the server: npm run start
 * 3. In another terminal, run this script: npm run test:e2e -- test/update-null-fields.test.ts
 * 
 * Or manually test using curl:
 * curl -X POST http://localhost:3000/scraper/trigger-scraper-update
 */

import { INestApplication } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from 'src/adapters/prisma.service';
import { MovieUpdaterService } from 'src/scraper/services/movie-updater.service';
import { MovieStorageService } from 'src/scraper/services/movie-storage.service';

describe('Update Null Fields Feature (e2e)', () => {
  let app: INestApplication;
  let prismaService: PrismaService;
  let movieStorageService: MovieStorageService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [],
    }).compile();

    app = moduleFixture.createNestApplication();
    prismaService = app.get<PrismaService>(PrismaService);
    movieStorageService = app.get<MovieStorageService>(MovieStorageService);

    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('MovieStorageService.findMoviesWithNullFields', () => {
    it('should find movies with null scalar fields', async () => {
      // Create a test movie with null fields
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-movie-1',
          title: 'Test Movie 1',
          originalTitle: null,
          releaseDate: null,
          director: null,
        },
      });

      const moviesWithNulls = await movieStorageService.findMoviesWithNullFields();

      expect(moviesWithNulls).toContain('test-movie-1');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-movie-1' },
      });
    });

    it('should find movies with empty string fields', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-movie-2',
          title: 'Test Movie 2',
          originalTitle: '',
          director: '',
        },
      });

      const moviesWithNulls = await movieStorageService.findMoviesWithNullFields();

      expect(moviesWithNulls).toContain('test-movie-2');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-movie-2' },
      });
    });

    it('should find movies with empty alternative titles array', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-movie-3',
          title: 'Test Movie 3',
          alternativeTitles: [],
        },
      });

      const moviesWithNulls = await movieStorageService.findMoviesWithNullFields();

      expect(moviesWithNulls).toContain('test-movie-3');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-movie-3' },
      });
    });

    it('should find movies with empty title', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-movie-empty-title',
          title: '', // Empty title
        },
      });

      const moviesWithNulls = await movieStorageService.findMoviesWithNullFields();

      expect(moviesWithNulls).toContain('test-movie-empty-title');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-movie-empty-title' },
      });
    });

    it('should find movies with no genres', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-movie-4',
          title: 'Test Movie 4',
        },
      });

      const moviesWithNulls = await movieStorageService.findMoviesWithNullFields();

      expect(moviesWithNulls).toContain('test-movie-4');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-movie-4' },
      });
    });
  });

  describe('MovieStorageService.updateNullFieldsOnly', () => {
    it('should update null fields without overwriting existing data', async () => {
      // Create a test movie with some null fields
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-update-1',
          title: 'Test Movie Update 1',
          originalTitle: 'Original Title',
          director: null,
          synopsisEn: null,
          duration: '120 mins',
          rating: null,
        },
      });

      // Prepare update data
      const updateData = {
        slug: 'test-update-1',
        posterUrl: 'https://example.com/poster.jpg',
        details: {
          title: 'New Title',
          originalTitle: 'New Original Title',
          director: 'New Director',
          synopsis: 'New Synopsis',
          posterImage: 'https://example.com/new-poster.jpg',
          releaseYear: '2024',
          duration: '140 mins',
          rating: '8.5',
          genres: [],
          country: [],
          language: [],
          alternativeTitles: [],
        },
        streaming: [],
      };

      const updatedMovie = await movieStorageService.updateNullFieldsOnly(updateData);

      // Verify results
      expect(updatedMovie).not.toBeNull();

      const movieInDb = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-update-1' },
      });

      // Check that null fields were updated
      expect(movieInDb.director).toBe('New Director');
      expect(movieInDb.synopsisEn).toBe('New Synopsis');
      expect(movieInDb.rating).toBe('8.5');

      // Check that existing fields were NOT overwritten
      expect(movieInDb.originalTitle).toBe('Original Title'); // Should NOT be updated
      expect(movieInDb.duration).toBe('120 mins'); // Should NOT be updated

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-update-1' },
      });
    });

    it('should not create new movies', async () => {
      const updateData = {
        slug: 'non-existing-movie',
        posterUrl: null,
        details: {
          title: 'Non Existing Movie',
          originalTitle: 'Original',
          director: 'Director',
          synopsis: 'Synopsis',
          posterImage: null,
          releaseYear: '2024',
          duration: '120 mins',
          rating: '8.0',
          genres: [],
          country: [],
          language: [],
          alternativeTitles: [],
        },
        streaming: [],
      };

      const result = await movieStorageService.updateNullFieldsOnly(updateData);

      // Should return null for non-existing movie
      expect(result).toBeNull();

      // Verify movie was not created
      const movieInDb = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'non-existing-movie' },
      });

      expect(movieInDb).toBeUndefined();
    });

    it('should update relations (genres, country, language)', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-relations-1',
          title: 'Test Movie Relations 1',
        },
      });

      const updateData = {
        slug: 'test-relations-1',
        posterUrl: null,
        details: {
          title: 'Test Movie Relations 1',
          originalTitle: null,
          director: null,
          synopsis: null,
          posterImage: null,
          releaseYear: null,
          duration: null,
          rating: null,
          genres: ['Action', 'Drama'],
          country: ['USA', 'Brazil'],
          language: ['English', 'Portuguese'],
          alternativeTitles: [],
        },
        streaming: [],
      };

      const updatedMovie = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(updatedMovie).not.toBeNull();

      // Verify relations were created
      const movieWithRelations = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-relations-1' },
        include: {
          genres: true,
          country: true,
          language: true,
        },
      });

      expect(movieWithRelations.genres.length).toBe(2);
      expect(movieWithRelations.country.length).toBe(2);
      expect(movieWithRelations.language.length).toBe(2);

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-relations-1' },
      });
    });

    it('should update streaming services', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-streaming-1',
          title: 'Test Movie Streaming 1',
        },
      });

      const updateData = {
        slug: 'test-streaming-1',
        posterUrl: null,
        details: {
          title: 'Test Movie Streaming 1',
          originalTitle: null,
          director: null,
          synopsis: null,
          posterImage: null,
          releaseYear: null,
          duration: null,
          rating: null,
          genres: [],
          country: [],
          language: [],
          alternativeTitles: [],
        },
        streaming: [
          { service: 'Netflix', link: 'https://netflix.com/movie' },
          { service: 'Amazon Prime', link: 'https://prime.com/movie' },
        ],
      };

      const updatedMovie = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(updatedMovie).not.toBeNull();

      // Verify streaming services were created
      const movieWithServices = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-streaming-1' },
        include: {
          streamingServices: true,
        },
      });

      expect(movieWithServices.streamingServices.length).toBe(2);

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-streaming-1' },
      });
    });

    it('should handle alternative titles', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-alt-titles-1',
          title: 'Test Movie Alt Titles 1',
          alternativeTitles: [],
        },
      });

      const updateData = {
        slug: 'test-alt-titles-1',
        posterUrl: null,
        details: {
          title: 'Test Movie Alt Titles 1',
          originalTitle: null,
          director: null,
          synopsis: null,
          posterImage: null,
          releaseYear: null,
          duration: null,
          rating: null,
          genres: [],
          country: [],
          language: [],
          alternativeTitles: ['Alternative Title 1', 'Alternative Title 2'],
        },
        streaming: [],
      };

      const updatedMovie = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(updatedMovie).not.toBeNull();

      const movieInDb = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-alt-titles-1' },
      });

      expect(movieInDb.alternativeTitles).toEqual(['Alternative Title 1', 'Alternative Title 2']);

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-alt-titles-1' },
      });
    });
  });

  describe('Edge Cases', () => {
    it('should skip movies with all fields already filled', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-complete-1',
          title: 'Complete Movie',
          originalTitle: 'Original',
          director: 'Director',
          synopsisEn: 'Synopsis',
          duration: '120 mins',
          rating: '8.0',
          releaseDate: '2024',
          alternativeTitles: ['Alt 1', 'Alt 2'],
        },
      });

      // Add relations
      await prismaService.scrapedMovie.update({
        where: { slug: 'test-complete-1' },
        data: {
          genres: {
            connectOrCreate: [
              {
                where: { slug: 'action' },
                create: { nome: 'Action', slug: 'action' },
              },
            ],
          },
        },
      });

      const updateData = {
        slug: 'test-complete-1',
        posterUrl: null,
        details: {
          title: 'Different Title',
          originalTitle: 'Different Original',
          director: 'Different Director',
          synopsis: 'Different Synopsis',
          posterImage: null,
          releaseYear: '2025',
          duration: '140 mins',
          rating: '9.0',
          genres: ['Drama'],
          country: [],
          language: [],
          alternativeTitles: ['Different Alt'],
        },
        streaming: [],
      };

      const result = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(result).not.toBeNull();

      // Verify nothing was changed
      const movieInDb = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-complete-1' },
      });

      expect(movieInDb.title).toBe('Complete Movie');
      expect(movieInDb.originalTitle).toBe('Original');
      expect(movieInDb.director).toBe('Director');
      expect(movieInDb.duration).toBe('120 mins');
      expect(movieInDb.rating).toBe('8.0');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-complete-1' },
      });
    });

    it('should handle null values gracefully', async () => {
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-nulls-1',
          title: 'Test Nulls',
        },
      });

      const updateData = {
        slug: 'test-nulls-1',
        posterUrl: null,
        details: {
          title: 'Test Nulls',
          originalTitle: null,
          director: null,
          synopsis: null,
          posterImage: null,
          releaseYear: null,
          duration: null,
          rating: null,
          genres: [],
          country: [],
          language: [],
          alternativeTitles: [],
        },
        streaming: [],
      };

      // Should not throw error
      const result = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(result).not.toBeNull();

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-nulls-1' },
      });
    });

    it('should update title when it is empty', async () => {
      // Create a test movie with empty title
      const testMovie = await prismaService.scrapedMovie.create({
        data: {
          slug: 'test-empty-title',
          title: '', // Empty title
          originalTitle: null,
          director: null,
        },
      });

      const updateData = {
        slug: 'test-empty-title',
        posterUrl: null,
        details: {
          title: 'Updated Title',
          originalTitle: null,
          director: 'Director Name',
          synopsis: null,
          posterImage: null,
          releaseYear: null,
          duration: null,
          rating: null,
          genres: [],
          country: [],
          language: [],
          alternativeTitles: [],
        },
        streaming: [],
      };

      const result = await movieStorageService.updateNullFieldsOnly(updateData);

      expect(result).not.toBeNull();

      const movieInDb = await prismaService.scrapedMovie.findUnique({
        where: { slug: 'test-empty-title' },
      });

      // Verify title was updated
      expect(movieInDb.title).toBe('Updated Title');
      expect(movieInDb.director).toBe('Director Name');

      // Cleanup
      await prismaService.scrapedMovie.delete({
        where: { slug: 'test-empty-title' },
      });
    });
  });
});