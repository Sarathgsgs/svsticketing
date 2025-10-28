from flask import Flask, request, jsonify
from werkzeug.utils import secure_filename
import os
from utils import classify_ticket, suggest_similar_solutions

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

app = Flask(__name__)
from flask_cors import CORS
CORS(app)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER

@app.route('/classify', methods=['POST'])
def classify_endpoint():
    data = request.get_json(force=True)
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'text missing'}), 400
    cls = classify_ticket(text)
    return jsonify(cls)

@app.route('/triage', methods=['POST'])
def triage_endpoint():
    """
    Input: JSON { "text": "...ticket text..." }
    Output: category, priority, suggested fixes (from similar tickets), recommended team
    """
    data = request.get_json(force=True)
    text = data.get('text', '')
    if not text:
        return jsonify({'error': 'text missing'}), 400
    cls = classify_ticket(text)
    suggestions = suggest_similar_solutions(text, top_k=3)
    team_map = {
        'SCADA': 'SCADA Team',
        'Communication': 'Network Team',
        'Database': 'DBA Team',
        'Security': 'Security Operations',
        'Configuration': 'Field Engineering'
    }
    recommended_team = team_map.get(cls['category'], 'General Support')
    response = {
        'category': cls['category'],
        'priority': cls['priority'],
        'category_confidence': cls['category_conf'],
        'priority_confidence': cls['priority_conf'],
        'recommended_team': recommended_team,
        'suggestions': suggestions
    }
    return jsonify(response)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8001, debug=True)