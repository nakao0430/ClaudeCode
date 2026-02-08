import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../config/environment';
import type {
  Recipe,
  RecipeListResponse,
  RecipeListParams,
  CreateRecipeRequest,
  UpdateRecipeRequest,
} from '../models/recipe.model';

@Injectable({
  providedIn: 'root',
})
export class RecipeService {
  private readonly apiUrl = `${environment.apiUrl}/recipes`;

  constructor(private http: HttpClient) {}

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
}
