import React, { useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  Button,
  TextInput,
  Image,
  Alert,
  ScrollView,
  Pressable,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { analyze, saveAdjusted, lookupIngredient } from '../api';
import type { DetectedItem, Nutrition } from '../analysis';
import { scalePer100g, round1, sumTotals } from '../analysis';

type IngredientMatch = {
  ingredient_id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  servings: Array<{ label: string; grams: number }>;
  confidence: number;
  source: string;
};

type AddOn = {
  id: string;
  name: string;
  grams: number;
  // best selected match + live candidates for dropdown suggestions
  match?: IngredientMatch | null;
  candidates?: IngredientMatch[];
  nutrition: Nutrition; // computed from per100g * grams
};

function toRNItem(raw: any): DetectedItem {
  return {
    itemId: Number(raw.itemId),
    name: String(raw.name || 'food'),
    confidence: Number(raw.confidence || 0.5),
    cookingMethod: raw.cookingMethod,
    ingredients: raw.ingredients || [],
    portionSize: {
      estimatedGrams: Number(raw.portionSize?.estimatedGrams || 100),
      confidenceRange: raw.portionSize?.confidenceRange,
      servingSizeCategory: raw.portionSize?.servingSizeCategory,
    },
    nutrition: {
      calories: Number(raw.nutrition?.calories || 0),
      protein: Number(raw.nutrition?.protein || 0),
      carbs: Number(raw.nutrition?.carbs || 0),
      fat: Number(raw.nutrition?.fat || 0),
      fiber: Number(raw.nutrition?.fiber || 0),
      sugar: Number(raw.nutrition?.sugar || 0),
      sodium: Number(raw.nutrition?.sodium || 0),
      cholesterol: Number(raw.nutrition?.cholesterol || 0),
    },
    nutritionPer100g: raw.nutritionPer100g,
  };
}

function macrosFromMatch(m: IngredientMatch, grams: number): Nutrition {
  const f = grams / 100;
  return {
    calories: Math.round((m.calories_per_100g || 0) * f),
    protein: round1((m.protein_per_100g || 0) * f),
    carbs: round1((m.carbs_per_100g || 0) * f),
    fat: round1((m.fat_per_100g || 0) * f),
    fiber: 0,
    sugar: 0,
    sodium: 0,
    cholesterol: 0,
  };
}

export default function HomeScreen() {
  const [imageDataUrl, setImageDataUrl] = useState<string | undefined>(
    undefined
  );
  const [manualText, setManualText] = useState('');
  const [showManual, setShowManual] = useState(false);

  const [analysisId, setAnalysisId] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<DetectedItem[]>([]);
  const [addOns, setAddOns] = useState<AddOn[]>([]);

  const [busyAnalyze, setBusyAnalyze] = useState(false);
  const [busySave, setBusySave] = useState(false);

  const totals = useMemo(() => {
    const t = sumTotals(items.map((i) => i.nutrition));
    const t2 = { ...t };
    for (const add of addOns) {
      t2.calories += Math.round(add.nutrition.calories || 0);
      t2.protein = round1(t2.protein + (add.nutrition.protein || 0));
      t2.carbs = round1(t2.carbs + (add.nutrition.carbs || 0));
      t2.fat = round1(t2.fat + (add.nutrition.fat || 0));
    }
    return t2;
  }, [items, addOns]);

  // ─────────────────── image pickers ───────────────────
  async function pickFromLibrary() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted')
      return Alert.alert('Permission needed to access photos');
    const res = await ImagePicker.launchImageLibraryAsync({
      base64: true,
      quality: 0.7,
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
    });
    if (!res.canceled && res.assets?.[0]?.base64) {
      setImageDataUrl(`data:image/jpeg;base64,${res.assets[0].base64}`);
      setShowManual(false);
    }
  }

  async function takePhoto() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') return Alert.alert('Camera permission denied');
    const res = await ImagePicker.launchCameraAsync({
      base64: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets?.[0]?.base64) {
      setImageDataUrl(`data:image/jpeg;base64,${res.assets[0].base64}`);
      setShowManual(false);
    }
  }

  // ─────────── analyze -> enrich items via DB lookups ───────────
  async function enrichItemsWithDB(list: DetectedItem[]) {
    const out: DetectedItem[] = [];
    for (const it of list) {
      let next = { ...it };
      const grams = Math.max(1, Number(it.portionSize?.estimatedGrams || 0));
      // If server didn’t include per100g, try DB
      if (!it.nutritionPer100g || !it.nutrition?.calories) {
        try {
          const matches = await lookupIngredient(it.name, 3);
          if (matches?.length) {
            const m = matches[0];
            const per100 = {
              calories: Number(m.calories_per_100g || 0),
              protein: Number(m.protein_per_100g || 0),
              carbs: Number(m.carbs_per_100g || 0),
              fat: Number(m.fat_per_100g || 0),
            };
            next.nutritionPer100g = per100;
            next.nutrition = scalePer100g(per100, grams);
          }
        } catch {
          // leave item as-is if lookup fails
        }
      } else {
        next.nutrition = scalePer100g(next.nutritionPer100g, grams);
      }
      out.push(next);
    }
    return out;
  }

  async function onAnalyzeImage() {
    if (!imageDataUrl || busyAnalyze) return;
    try {
      setBusyAnalyze(true);
      const r = await analyze({ imageBase64: imageDataUrl });
      if (!r.success || !r.data) throw new Error(r.error || 'Analyze failed');
      setAnalysisId(r.data.analysisId);
      const base = (r.data.detectedItems || []).map(toRNItem);
      const enriched = await enrichItemsWithDB(base);
      setItems(enriched);
      setAddOns([]);
    } catch (e: any) {
      Alert.alert('Analyze error', String(e?.message || e));
    } finally {
      setBusyAnalyze(false);
    }
  }

  async function onAnalyzeText() {
    if (!manualText.trim() || busyAnalyze) return;
    try {
      setBusyAnalyze(true);
      const r = await analyze({ prompt: manualText.trim() });
      if (!r.success || !r.data) throw new Error(r.error || 'Analyze failed');
      setAnalysisId(r.data.analysisId);
      const base = (r.data.detectedItems || []).map(toRNItem);
      const enriched = await enrichItemsWithDB(base);
      setItems(enriched);
      setAddOns([]);
    } catch (e: any) {
      Alert.alert('Analyze error', String(e?.message || e));
    } finally {
      setBusyAnalyze(false);
    }
  }

  // ─────────────────── item portion edit ───────────────────
  function updateGrams(itemId: number, gramsStr: string) {
    const grams = Math.max(0, Number(gramsStr.replace(/[^\d.]/g, '')) || 0);
    setItems((prev) =>
      prev.map((it) => {
        if (it.itemId !== itemId) return it;
        if (it.nutritionPer100g) {
          return {
            ...it,
            portionSize: { ...it.portionSize, estimatedGrams: grams },
            nutrition: scalePer100g(it.nutritionPer100g, grams),
          };
        }
        const old = Math.max(1, it.portionSize.estimatedGrams || 100);
        const f = grams / old;
        const next: Nutrition = {
          calories: Math.round((it.nutrition.calories || 0) * f),
          protein: round1((it.nutrition.protein || 0) * f),
          carbs: round1((it.nutrition.carbs || 0) * f),
          fat: round1((it.nutrition.fat || 0) * f),
          fiber: round1((it.nutrition.fiber || 0) * f),
          sugar: round1((it.nutrition.sugar || 0) * f),
          sodium: Math.round((it.nutrition.sodium || 0) * f),
          cholesterol: Math.round((it.nutrition.cholesterol || 0) * f),
        };
        return {
          ...it,
          portionSize: { ...it.portionSize, estimatedGrams: grams },
          nutrition: next,
        };
      })
    );
  }

  // ─────────────────── Add Ingredient (DB-driven) ───────────────────
  function addAddOn() {
    setAddOns((prev) => [
      ...prev,
      {
        id: Math.random().toString(36).slice(2),
        name: '',
        grams: 0,
        match: null,
        candidates: [],
        nutrition: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      },
    ]);
  }
  function rmAddOn(id: string) {
    setAddOns((prev) => prev.filter((x) => x.id !== id));
  }

  // Debounced lookup for name field
  const timers = useRef<Record<string, any>>({});
  function editAddOnName(id: string, name: string) {
    setAddOns((prev) =>
      prev.map((x) => (x.id === id ? { ...x, name, match: null } : x))
    );

    if (timers.current[id]) clearTimeout(timers.current[id]);
    timers.current[id] = setTimeout(async () => {
      try {
        const matches = name.trim()
          ? await lookupIngredient(name.trim(), 8)
          : [];
        setAddOns((prev) =>
          prev.map((x) => {
            if (x.id !== id) return x;
            const first = matches?.[0];
            const nutrition = first
              ? macrosFromMatch(first, x.grams || 0)
              : x.nutrition;
            return {
              ...x,
              candidates: matches || [],
              match: first || null,
              nutrition,
            };
          })
        );
      } catch {
        // ignore errors
      }
    }, 250);
  }

  function selectCandidate(id: string, m: IngredientMatch) {
    setAddOns((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        return {
          ...x,
          match: m,
          nutrition: macrosFromMatch(m, x.grams || 0),
        };
      })
    );
  }

  function pickServing(id: string, grams: number) {
    setAddOns((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const nutrition = x.match
          ? macrosFromMatch(x.match, grams)
          : x.nutrition;
        return { ...x, grams, nutrition };
      })
    );
  }

  function editAddOnGrams(id: string, gramsStr: string) {
    const grams = Math.max(0, Number(gramsStr.replace(/[^\d.]/g, '')) || 0);
    setAddOns((prev) =>
      prev.map((x) => {
        if (x.id !== id) return x;
        const nutrition = x.match
          ? macrosFromMatch(x.match, grams)
          : x.nutrition;
        return { ...x, grams, nutrition };
      })
    );
  }

  async function onSaveAdjustments() {
    if (!analysisId || busySave) return Alert.alert('Analyze first');
    try {
      setBusySave(true);
      const payload = items.map((it) => ({
        itemId: it.itemId,
        portionSize: {
          estimatedGrams: Number(it.portionSize.estimatedGrams || 0),
        },
      }));
      const r = await saveAdjusted({
        id: analysisId,
        adjustedItems: payload,
        ingredientAddOns: addOns.map((a) => ({
          name: a.match?.name || a.name || 'ingredient',
          calories: a.nutrition.calories,
          protein: a.nutrition.protein,
          carbs: a.nutrition.carbs,
          fat: a.nutrition.fat,
        })),
      });
      if (!r?.success) throw new Error(r?.error || 'Save failed');
      Alert.alert('Saved', 'Adjustments saved');
    } catch (e: any) {
      Alert.alert('Save error', String(e?.message || e));
    } finally {
      setBusySave(false);
    }
  }

  // ─────────────────── UI ───────────────────
  if (items.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 16,
        }}
      >
        <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 16 }}>
          DietTrack
        </Text>

        <View style={{ width: '90%', maxWidth: 480 }}>
          <View style={{ marginBottom: 8 }}>
            <Button title="Pick Image" onPress={pickFromLibrary} />
          </View>
          <View style={{ marginBottom: 8 }}>
            <Button title="Take Photo" onPress={takePhoto} />
          </View>
          <View style={{ marginBottom: 8 }}>
            <Button
              title={showManual ? 'Hide Manual Entry' : 'Type Meal Manually'}
              onPress={() => {
                setShowManual((s) => !s);
                if (!showManual) setImageDataUrl(undefined);
              }}
            />
          </View>

          {imageDataUrl ? (
            <View style={{ alignItems: 'center', marginTop: 12 }}>
              <Image
                source={{ uri: imageDataUrl }}
                style={{
                  width: 240,
                  height: 240,
                  borderRadius: 12,
                  marginBottom: 8,
                }}
              />
              <View style={{ flexDirection: 'row', gap: 12 }}>
                <View style={{ flex: 1, marginRight: 6 }}>
                  <Button
                    title={busyAnalyze ? 'Analyzing…' : 'Analyze Image'}
                    onPress={onAnalyzeImage}
                    disabled={busyAnalyze}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 6 }}>
                  <Button
                    title="Remove Image"
                    onPress={() => setImageDataUrl(undefined)}
                  />
                </View>
              </View>
            </View>
          ) : null}

          {showManual ? (
            <View style={{ marginTop: 12 }}>
              <Text>Describe your meal:</Text>
              <TextInput
                placeholder="e.g., roti, dal, paneer tikka"
                multiline
                value={manualText}
                onChangeText={setManualText}
                style={{
                  borderWidth: 1,
                  borderRadius: 8,
                  padding: 10,
                  height: 100,
                  marginTop: 6,
                  marginBottom: 8,
                }}
              />
              <Button
                title={busyAnalyze ? 'Analyzing…' : 'Analyze Description'}
                onPress={onAnalyzeText}
                disabled={busyAnalyze}
              />
            </View>
          ) : null}
        </View>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 16 }}>
      <Text style={{ fontSize: 22, fontWeight: '700', marginBottom: 12 }}>
        Results
      </Text>
      <Text style={{ marginBottom: 12 }}>
        Total: {totals.calories} kcal • P {totals.protein}g • C {totals.carbs}g
        • F {totals.fat}g
      </Text>

      {items.map((it) => (
        <View
          key={it.itemId}
          style={{
            borderWidth: 1,
            borderRadius: 12,
            padding: 12,
            marginBottom: 10,
          }}
        >
          <Text style={{ fontWeight: '600' }}>
            #{it.itemId} {it.name}
          </Text>
          <Text>Calories: {it.nutrition.calories} kcal</Text>
          <Text>Protein: {it.nutrition.protein} g</Text>
          <Text>Carbs: {it.nutrition.carbs} g</Text>
          <Text>Fat: {it.nutrition.fat} g</Text>

          <View style={{ marginTop: 8 }}>
            <Text>Portion (grams):</Text>
            <TextInput
              keyboardType="numeric"
              value={String(it.portionSize.estimatedGrams || 0)}
              onChangeText={(t) => updateGrams(it.itemId, t)}
              style={{
                borderWidth: 1,
                borderRadius: 8,
                padding: 8,
                marginTop: 4,
                width: 140,
              }}
            />
          </View>

          {it.ingredients?.length ? (
            <Text style={{ marginTop: 6, color: '#444' }}>
              Ingredients: {it.ingredients.join(', ')}
            </Text>
          ) : null}
        </View>
      ))}

      <View
        style={{ marginTop: 8, borderWidth: 1, borderRadius: 12, padding: 12 }}
      >
        <Text style={{ fontWeight: '600', marginBottom: 8 }}>
          Add missing ingredient
        </Text>

        {addOns.map((x) => (
          <View
            key={x.id}
            style={{
              borderWidth: 1,
              borderRadius: 8,
              padding: 8,
              marginBottom: 8,
            }}
          >
            <Text>Name</Text>
            <TextInput
              value={x.name}
              onChangeText={(t) => editAddOnName(x.id, t)}
              placeholder="e.g., peanut butter"
              style={{
                borderWidth: 1,
                borderRadius: 6,
                padding: 6,
                marginBottom: 6,
              }}
            />

            {/* simple suggestion list */}
            {x.candidates && x.candidates.length > 0 ? (
              <View style={{ marginBottom: 6 }}>
                {x.candidates.slice(0, 5).map((m) => (
                  <Pressable
                    key={m.ingredient_id}
                    onPress={() => selectCandidate(x.id, m)}
                    style={{
                      paddingVertical: 6,
                      paddingHorizontal: 8,
                      borderWidth: 1,
                      borderRadius: 6,
                      marginBottom: 6,
                    }}
                  >
                    <Text>{m.name}</Text>
                    <Text style={{ fontSize: 12, color: '#666' }}>
                      {Math.round(m.calories_per_100g)} kcal /100g • P
                      {m.protein_per_100g} C{m.carbs_per_100g} F{m.fat_per_100g}
                    </Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            {x.match && x.match.servings?.length ? (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                {x.match.servings.slice(0, 6).map((s) => (
                  <Pressable
                    key={`${x.id}-${s.label}`}
                    onPress={() => pickServing(x.id, Number(s.grams))}
                    style={{
                      borderWidth: 1,
                      borderRadius: 16,
                      paddingVertical: 6,
                      paddingHorizontal: 10,
                      marginRight: 6,
                      marginTop: 6,
                    }}
                  >
                    <Text>{s.label}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}

            <Text>Grams</Text>
            <TextInput
              keyboardType="numeric"
              value={String(x.grams || '')}
              onChangeText={(t) => editAddOnGrams(x.id, t)}
              placeholder="e.g., 16"
              style={{
                borderWidth: 1,
                borderRadius: 6,
                padding: 6,
                marginBottom: 6,
              }}
            />

            <Text>Calories: {x.nutrition.calories} kcal</Text>
            <Text>Protein: {x.nutrition.protein} g</Text>
            <Text>Carbs: {x.nutrition.carbs} g</Text>
            <Text>Fat: {x.nutrition.fat} g</Text>

            <View style={{ height: 8 }} />
            <Button title="Remove" onPress={() => rmAddOn(x.id)} />
          </View>
        ))}

        <Button title="Add Ingredient" onPress={addAddOn} />
      </View>

      <View style={{ height: 12 }} />
      <Button
        title={busySave ? 'Saving…' : 'Save Adjustments'}
        onPress={onSaveAdjustments}
        disabled={busySave}
      />

      <View style={{ height: 24 }} />
      <Button
        title="Start Over"
        onPress={() => {
          setItems([]);
          setAddOns([]);
          setImageDataUrl(undefined);
          setManualText('');
          setShowManual(false);
          setAnalysisId(undefined);
        }}
      />
      <View style={{ height: 60 }} />
    </ScrollView>
  );
}
