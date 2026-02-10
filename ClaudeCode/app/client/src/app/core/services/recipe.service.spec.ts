import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { RecipeService } from './recipe.service';
import { environment } from '../config/environment';

describe('RecipeService', () => {
  let service: RecipeService;
  let httpTesting: HttpTestingController;
  const apiUrl = `${environment.apiUrl}/recipes`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(RecipeService);
    httpTesting = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTesting.verify();
  });

  describe('list', () => {
    it('should GET /recipes with no params', () => {
      service.list().subscribe((res) => {
        expect(res.items).toEqual([]);
      });

      const req = httpTesting.expectOne(apiUrl);
      expect(req.request.method).toBe('GET');
      req.flush({ items: [] });
    });

    it('should pass q param when provided', () => {
      service.list({ q: '鶏肉' }).subscribe();

      const req = httpTesting.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('q')).toBe('鶏肉');
      req.flush({ items: [] });
    });

    it('should pass limit and nextToken params', () => {
      service.list({ limit: 10, nextToken: 'abc123' }).subscribe();

      const req = httpTesting.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('limit')).toBe('10');
      expect(req.request.params.get('nextToken')).toBe('abc123');
      req.flush({ items: [], nextToken: 'next' });
    });
  });

  describe('get', () => {
    it('should GET /recipes/:id', () => {
      service.get('recipe-1').subscribe((recipe) => {
        expect(recipe.title).toBe('テスト');
      });

      const req = httpTesting.expectOne(`${apiUrl}/recipe-1`);
      expect(req.request.method).toBe('GET');
      req.flush({ title: 'テスト' });
    });
  });

  describe('create', () => {
    it('should POST /recipes', () => {
      const body = {
        title: '新レシピ',
        description: '説明',
        ingredients: [{ name: '材料', amount: '1', unit: '個' }],
        steps: [{ stepNumber: 1, description: 'ステップ' }],
        categories: [],
        tags: [],
      };

      service.create(body).subscribe((recipe) => {
        expect(recipe.title).toBe('新レシピ');
      });

      const req = httpTesting.expectOne(apiUrl);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(body);
      req.flush({ ...body, userId: 'u1', recipeId: 'r1', createdAt: '', updatedAt: '' });
    });
  });

  describe('update', () => {
    it('should PUT /recipes/:id', () => {
      const body = { title: '更新' };

      service.update('recipe-1', body).subscribe((recipe) => {
        expect(recipe.title).toBe('更新');
      });

      const req = httpTesting.expectOne(`${apiUrl}/recipe-1`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual(body);
      req.flush({ title: '更新' });
    });
  });

  describe('delete', () => {
    it('should DELETE /recipes/:id', () => {
      service.delete('recipe-1').subscribe();

      const req = httpTesting.expectOne(`${apiUrl}/recipe-1`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });

  describe('setFavorite', () => {
    it('should PUT /recipes/:id/favorite with isFavorite true', () => {
      service.setFavorite('recipe-1', true).subscribe((recipe) => {
        expect(recipe.isFavorite).toBe(true);
      });

      const req = httpTesting.expectOne(`${apiUrl}/recipe-1/favorite`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isFavorite: true });
      req.flush({ recipeId: 'recipe-1', isFavorite: true });
    });

    it('should PUT /recipes/:id/favorite with isFavorite false', () => {
      service.setFavorite('recipe-1', false).subscribe((recipe) => {
        expect(recipe.isFavorite).toBe(false);
      });

      const req = httpTesting.expectOne(`${apiUrl}/recipe-1/favorite`);
      expect(req.request.method).toBe('PUT');
      expect(req.request.body).toEqual({ isFavorite: false });
      req.flush({ recipeId: 'recipe-1', isFavorite: false });
    });
  });

  describe('list with favoritesOnly', () => {
    it('should pass favorites=true param when favoritesOnly is true', () => {
      service.list({ favoritesOnly: true }).subscribe();

      const req = httpTesting.expectOne((r) => r.url === apiUrl);
      expect(req.request.params.get('favorites')).toBe('true');
      req.flush({ items: [] });
    });

    it('should not pass favorites param when favoritesOnly is false', () => {
      service.list({ favoritesOnly: false }).subscribe();

      const req = httpTesting.expectOne(apiUrl);
      expect(req.request.params.has('favorites')).toBe(false);
      req.flush({ items: [] });
    });
  });
});
