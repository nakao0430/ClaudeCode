import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import type {
  Recipe,
  RecipeListResponse,
  RecipeListParams,
  CreateRecipeRequest,
  UpdateRecipeRequest,
  ScrapeResponse,
} from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = `${environment.apiUrl}/recipes`;

  list(params: RecipeListParams = {}): Observable<RecipeListResponse> {
    let httpParams = new HttpParams();

    if (params.q) {
      httpParams = httpParams.set('q', params.q);
    }

    if (params.limit) {
      httpParams = httpParams.set('limit', params.limit.toString());
    }

    if (params.nextToken) {
      httpParams = httpParams.set('nextToken', params.nextToken);
    }

    if (params.favoritesOnly) {
      httpParams = httpParams.set('favorites', 'true');
    }

    return this.http.get<RecipeListResponse>(this.apiUrl, { params: httpParams });
  }

  get(id: string): Observable<Recipe> {
    return this.http.get<Recipe>(`${this.apiUrl}/${id}`);
  }

  create(recipe: CreateRecipeRequest): Observable<Recipe> {
    return this.http.post<Recipe>(this.apiUrl, recipe);
  }

  update(id: string, recipe: UpdateRecipeRequest): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.apiUrl}/${id}`, recipe);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  setFavorite(id: string, isFavorite: boolean): Observable<Recipe> {
    return this.http.put<Recipe>(`${this.apiUrl}/${id}/favorite`, { isFavorite });
  }

  scrapeFromUrl(url: string): Observable<ScrapeResponse> {
    return this.http.post<ScrapeResponse>(`${this.apiUrl}/scrape`, { url });
  }
}
